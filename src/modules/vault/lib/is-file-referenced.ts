/**
 * isFileStillReferenced — Vault Lib
 *
 * Used by the unreferenced-cleanup job to re-verify that a file marked with
 * unrefAt is genuinely absent from the latest saved entity content before
 * soft-deleting it. This is the safety net against false positives from
 * client-side undo within the grace period.
 *
 * Strategy per entity type:
 *   PAGE / TASK  — fetch the entity's S3 content and scan for the raw fileId
 *                  string (works for vault://fileId and presigned URL formats).
 *   WHITEBOARD   — load the Redis SnapshotLatest key (always the latest merged
 *                  Y.Doc state), parse it with Y.Doc, and check if the fileId
 *                  exists as a key in yAssets. Falls back to S3 via
 *                  Whiteboard.snapshotS3Key if Redis has expired.
 *
 * Returns:
 *   true  — file IS still referenced → skip deletion
 *   false — file is NOT referenced   → safe to delete
 *   false — entity / snapshot not found → orphaned → delete
 */

import type { PrismaClient } from '@prisma/client'
import { createLogger } from '@/shared/lib/logger'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { s3Client } from '@/infra/aws/s3'
import { env } from '@/shared/config/env'
import { appRedis } from '@/infra/redis'
import { Y } from '@/shared/yjs'
import { WhiteboardKeys } from '@/modules/whiteboard/infra/whiteboard-keys'
import type { RedisLatestSnapshot } from '@/modules/whiteboard/infra/stream-worker/types'

const logger = createLogger('vault:lib:is-file-referenced')

const VAULT_BUCKET = env.S3_VAULT_BUCKET

/** Fetch a vault S3 object as UTF-8 text. Returns null when not found. */
async function fetchS3Text(s3Key: string): Promise<string | null> {
  try {
    const res = await s3Client.send(
      new GetObjectCommand({ Bucket: VAULT_BUCKET, Key: s3Key }),
    )
    return (await res.Body?.transformToString('utf-8')) ?? null
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      (err.name === 'NoSuchKey' || err.name === 'AccessDenied')
    ) {
      return null
    }
    throw err
  }
}

/**
 * Check whether `fileId` is still referenced by the entity.
 *
 * @param fileId       - The VaultFile id to search for
 * @param entityId     - pageId, issueId, or boardId (from VaultFile.unrefEntityId)
 * @param entityType   - 'PAGE', 'TASK', or 'WHITEBOARD' (from VaultFile.unrefEntityType)
 * @param db           - Prisma client
 */
export async function isFileStillReferenced(
  fileId: string,
  entityId: string | null,
  entityType: string | null,
  db: PrismaClient,
): Promise<boolean> {
  if (!entityId || !entityType) {
    return false
  }

  // ─── PAGE ──────────────────────────────────────────────────────────────────
  if (entityType === 'PAGE') {
    const page = await db.page.findUnique({
      where: { id: entityId },
      select: { s3Key: true },
    })

    if (!page?.s3Key) {
      logger.debug('[REFERENCE_SCAN_RESULT] PAGE not found or no s3Key', { fileId, entityId })
      return false
    }

    const content = await fetchS3Text(page.s3Key)
    if (content === null) {
      logger.debug('[REFERENCE_SCAN_RESULT]', {
        fileId, entityId, entityType, s3Key: page.s3Key, found: false, reason: 's3-object-missing',
      })
      return false
    }
    const found = content.includes(fileId)
    logger.debug('[REFERENCE_SCAN_RESULT]', { fileId, entityId, entityType, s3Key: page.s3Key, found })
    return found
  }

  // ─── TASK ──────────────────────────────────────────────────────────────────
  if (entityType === 'TASK') {
    const issue = await db.issue.findUnique({
      where: { id: entityId },
      select: { descriptionS3Key: true },
    })

    if (!issue?.descriptionS3Key) {
      logger.debug('[REFERENCE_SCAN_RESULT] TASK not found or no descriptionS3Key', {
        fileId, entityId,
      })
      return false
    }

    const content = await fetchS3Text(issue.descriptionS3Key)
    if (content === null) {
      logger.debug('[REFERENCE_SCAN_RESULT]', {
        fileId, entityId, entityType, s3Key: issue.descriptionS3Key, found: false, reason: 's3-object-missing',
      })
      return false
    }
    const found = content.includes(fileId)
    logger.debug('[REFERENCE_SCAN_RESULT]', {
      fileId, entityId, entityType, s3Key: issue.descriptionS3Key, found,
    })
    return found
  }

  // ─── WHITEBOARD ────────────────────────────────────────────────────────────
  if (entityType === 'WHITEBOARD') {
    // Strategy: load Redis SnapshotLatest (most current merged Y.Doc) first.
    // If Redis has expired, fall back to S3 via Whiteboard.snapshotS3Key.
    // Parse with Y.Doc and check yAssets.has(fileId) — this is authoritative:
    // if the key is present, the image element is still on the board.
    const snapshotKey = WhiteboardKeys.SnapshotLatest(entityId)
    const cachedRaw = await appRedis.get(snapshotKey)

    let snapshotBin: Uint8Array | null = null

    if (cachedRaw) {
      try {
        const parsed = JSON.parse(cachedRaw) as RedisLatestSnapshot
        snapshotBin = Buffer.from(parsed.snapshot, 'base64')
        logger.debug('[REFERENCE_SCAN_RESULT] WHITEBOARD loaded from Redis', {
          fileId, entityId, snapshotSize: snapshotBin.length,
        })
      } catch {
        logger.warn('[REFERENCE_SCAN_RESULT] WHITEBOARD failed to parse Redis snapshot', {
          fileId, entityId,
        })
      }
    }

    // Redis miss or parse failure → fall back to S3 snapshot
    if (!snapshotBin) {
      const board = await db.whiteboard.findUnique({
        where: { id: entityId },
        select: { snapshotS3Key: true },
      })

      if (!board?.snapshotS3Key) {
        logger.debug('[REFERENCE_SCAN_RESULT] WHITEBOARD no snapshot found — treating as orphan', {
          fileId, entityId,
        })
        return false
      }

      try {
        const cmd = new GetObjectCommand({
          Bucket: env.S3_VAULT_BUCKET,
          Key: board.snapshotS3Key,
        })
        const res = await s3Client.send(cmd)
        const bytes = await res.Body?.transformToByteArray()
        if (bytes) {
          snapshotBin = bytes
          logger.debug('[REFERENCE_SCAN_RESULT] WHITEBOARD loaded from S3', {
            fileId, entityId, s3Key: board.snapshotS3Key, size: bytes.length,
          })
        }
      } catch {
        logger.debug('[REFERENCE_SCAN_RESULT] WHITEBOARD S3 snapshot not found', {
          fileId, entityId,
        })
        return false
      }
    }

    if (!snapshotBin) return false

    // Parse Y.Doc and scan yElements for a live image element with this fileId.
    //
    // y-excalidraw data model:
    //   yElements[i] = Y.Map({ el: { type: 'image', fileId: '...', isDeleted: false, ... } })
    //   The binding physically REMOVES elements from yElements on delete
    //   (yElements.delete(index, 1)), so deleted images are simply absent.
    //   yAssets entries persist as tombstones for undo — do NOT use yAssets.has().
    let found = false
    const tempDoc = new Y.Doc()
    try {
      Y.applyUpdate(tempDoc, snapshotBin)
      const yElements = tempDoc.getArray<Y.Map<unknown>>('elements')
      found = yElements.toArray().some((wrapper) => {
        const el = wrapper.get('el') as Record<string, unknown> | undefined
        if (!el) return false
        return (
          el['type'] === 'image' &&
          el['fileId'] === fileId &&
          !el['isDeleted']
        )
      })
    } catch (err) {
      logger.warn('[REFERENCE_SCAN_RESULT] WHITEBOARD Y.Doc parse failed — conservative skip', {
        fileId, entityId, err,
      })
      // Conservative: if we cannot parse, assume still referenced → skip deletion
      found = true
    } finally {
      tempDoc.destroy()
    }

    logger.info('[REFERENCE_SCAN_RESULT]', {
      fileId,
      entityId,
      entityType,
      found,
      strategy: 'yElements-scan',
    })
    return found
  }

  // Unknown entity type — conservative: do not delete
  logger.warn('[REFERENCE_SCAN_RESULT] unknown entityType', { entityType, fileId })
  return true
}
