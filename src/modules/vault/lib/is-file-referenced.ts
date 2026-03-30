/**
 * isFileStillReferenced — Vault Lib
 *
 * Used by the unreferenced-cleanup job to re-verify that a file marked with
 * unrefAt is genuinely absent from the latest saved entity content before
 * soft-deleting it. This is the safety net against false positives.
 *
 * Strategy: fetch the entity's server-stored S3 content and scan for the
 * fileId string. The fileId appears in both formats:
 *   - `vault://fileId`       — original stored form before URL resolution
 *   - `https://.../{fileId}/...` — presigned URL after client resolution
 *
 * Scanning for the raw fileId (a unique cuid) is sufficient and works
 * regardless of which format the S3 snapshot contains.
 *
 * Returns:
 *   true  — file IS still referenced → skip deletion
 *   false — file is NOT referenced   → safe to delete
 *   false — entity / S3 object not found → entity gone → file is orphaned → delete
 */

import type { PrismaClient } from '@prisma/client'
import { createLogger } from '@/shared/lib/logger'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { s3Client } from '@/infra/aws/s3'
import { env } from '@/shared/config/env'

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
 * Check whether `fileId` still appears as `vault://fileId` in the entity's
 * latest saved S3 content.
 *
 * @param fileId       - The VaultFile id to search for
 * @param entityId     - pageId or issueId (from VaultFile.unrefEntityId)
 * @param entityType   - 'PAGE' or 'TASK' (from VaultFile.unrefEntityType)
 * @param db           - Prisma client
 */
export async function isFileStillReferenced(
  fileId: string,
  entityId: string | null,
  entityType: string | null,
  db: PrismaClient,
): Promise<boolean> {
  if (!entityId || !entityType) {
    // No entity context — cannot verify → treat as orphan (allow deletion)
    return false
  }

  // Scan for the raw fileId string — works whether the doc stores
  // `vault://fileId` (original) or a presigned URL containing the fileId
  // in its S3 key path (after client URL resolution). The fileId is a
  // unique cuid that only appears as part of this file's reference.
  const searchToken = fileId

  if (entityType === 'PAGE') {
    const page = await db.page.findUnique({
      where: { id: entityId },
      select: { s3Key: true },
    })

    if (!page?.s3Key) {
      logger.debug('isFileStillReferenced: PAGE not found or no s3Key', { fileId, entityId })
      return false
    }

    const content = await fetchS3Text(page.s3Key)
    if (content === null) {
      logger.debug('[REFERENCE_SCAN_RESULT]', {
        fileId, entityId, entityType, s3Key: page.s3Key, found: false, reason: 's3-object-missing',
      })
      return false
    }
    const found = content.includes(searchToken)
    logger.debug('[REFERENCE_SCAN_RESULT]', {
      fileId, entityId, entityType, s3Key: page.s3Key, found,
    })
    return found
  }

  if (entityType === 'TASK') {
    const issue = await db.issue.findUnique({
      where: { id: entityId },
      select: { descriptionS3Key: true },
    })

    if (!issue?.descriptionS3Key) {
      logger.debug('isFileStillReferenced: TASK not found or no descriptionS3Key', {
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
    const found = content.includes(searchToken)
    logger.debug('[REFERENCE_SCAN_RESULT]', {
      fileId, entityId, entityType, s3Key: issue.descriptionS3Key, found,
    })
    return found
  }

  // Unknown entity type — conservative: do not delete
  logger.warn('isFileStillReferenced: unknown entityType', { entityType, fileId })
  return true
}
