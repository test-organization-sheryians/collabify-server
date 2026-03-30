/**
 * Vault — Unreferenced File Cleanup Job
 *
 * Companion to cleanup-pending.ts. Sweeps VaultFile rows that are:
 *   - status = ACTIVE
 *   - unrefAt IS NOT NULL (editor marked them unreferenced on save)
 *   - unrefAt < now() - GRACE_PERIOD_MS  (past the undo grace window)
 *
 * Before deleting each candidate, it re-verifies that the file is genuinely
 * absent from the entity's current saved content on S3. This protects against:
 *   - False positives (user re-added the file and saved again)
 *   - Multi-tab races (another tab saved content still containing the file)
 *
 * On confirmed deletion:
 *   1. Soft-delete VaultFile row + release usage quota (transactional)
 *   2. Hard-delete S3 object (best-effort — DB is authoritative)
 *
 * Grace period:
 *   Production : 30 minutes (GRACE_PERIOD_MS constant)
 *   Dev/test   : VAULT_FAST_CLEANUP_MS env var override (e.g. 10 000ms)
 *
 * Job cadence:
 *   Production : every 30 minutes
 *   Dev/test   : VAULT_CLEANUP_INTERVAL_MS env var (set in jobs/index.ts)
 *
 * Observability — structured log events emitted:
 *   [CLEANUP_JOB_STARTED]      — sweep begin with cutoff + config
 *   [FILE_ELIGIBLE_FOR_DELETE] — candidate found, about to re-verify
 *   [REFERENCE_SCAN_RESULT]    — emitted by isFileStillReferenced per scan
 *   [UNREF_CLEARED]            — file re-referenced, unref mark cleared
 *   [UNDO_WINDOW_EXPIRED]      — grace period elapsed, file confirmed deleted
 *   [S3_DELETE_REQUEST]        — S3 hard-delete about to be attempted
 *   [S3_DELETE_SUCCESS]        — S3 object confirmed gone
 *   [S3_DELETE_FAILED]         — S3 delete failed (DB already marked DELETED)
 *   [CLEANUP_JOB_COMPLETE]     — sweep done with totals
 *
 * Idempotent — re-running finds 0 rows if all candidates were processed.
 */

import { createLogger } from '@/shared/lib/logger'
import type { PrismaClient } from '@prisma/client'
import { env } from '@/shared/config/env'
import { isFileStillReferenced } from '../lib/is-file-referenced'
import { deleteS3Object } from '../lib/s3-keys'

const logger = createLogger('vault:jobs:unreferenced-cleanup')

// ── Timing config (production-safe) ───────────────────────────────────────────

/**
 * Grace period before an unreferenced file is eligible for deletion.
 * Gives the YJS UndoManager a comfortable window to restore the block.
 *
 * Dev override: set VAULT_FAST_CLEANUP_MS=10000 in .env.local for fast testing.
 * Production: always 30 minutes regardless of any env var.
 */
const GRACE_PERIOD_MS =
  env.NODE_ENV !== 'production' && env.VAULT_FAST_CLEANUP_MS
    ? env.VAULT_FAST_CLEANUP_MS
    : 30 * 60 * 1000

const IS_FAST_MODE =
  env.NODE_ENV !== 'production' && Boolean(env.VAULT_FAST_CLEANUP_MS)

const BATCH_SIZE = 50

// ── Main sweep ─────────────────────────────────────────────────────────────────

export async function cleanupUnreferencedFiles(db: PrismaClient): Promise<void> {
  const now = Date.now()
  const cutoff = new Date(now - GRACE_PERIOD_MS)

  logger.info('[CLEANUP_JOB_STARTED]', {
    cutoff: cutoff.toISOString(),
    gracePeriodMs: GRACE_PERIOD_MS,
    isFastMode: IS_FAST_MODE,
    batchSize: BATCH_SIZE,
  })

  let totalDeleted = 0
  let totalCleared = 0
  let totalSkippedOnError = 0

  while (true) {
    const candidates = await db.vaultFile.findMany({
      where: {
        status: 'ACTIVE',
        unrefAt: { not: null, lt: cutoff },
      },
      select: {
        id: true,
        projectId: true,
        workspaceId: true,
        sizeBytes: true,
        s3Key: true,
        unrefAt: true,
        unrefEntityId: true,
        unrefEntityType: true,
      },
      take: BATCH_SIZE,
    })

    if (candidates.length === 0) break

    logger.debug('[CLEANUP_BATCH]', { count: candidates.length, cutoff: cutoff.toISOString() })

    for (const file of candidates) {
      logger.debug('[FILE_ELIGIBLE_FOR_DELETE]', {
        fileId: file.id,
        unrefAt: file.unrefAt?.toISOString(),
        entityId: file.unrefEntityId,
        entityType: file.unrefEntityType,
        s3Key: file.s3Key,
      })

      // ── Re-verify against server-stored entity content ─────────────────────
      let stillReferenced = false
      try {
        stillReferenced = await isFileStillReferenced(
          file.id,
          file.unrefEntityId,
          file.unrefEntityType,
          db,
        )
      } catch (err) {
        // S3 / DB error → conservative: skip this file, try on next job run
        logger.error('[CLEANUP_VERIFY_ERROR]', {
          fileId: file.id,
          entityId: file.unrefEntityId,
          err,
        })
        totalSkippedOnError++
        continue
      }

      if (stillReferenced) {
        // File was re-added to the document after the unref mark was set.
        // Clear the unref fields so the job won't keep re-checking it.
        await db.vaultFile.update({
          where: { id: file.id },
          data: { unrefAt: null, unrefEntityId: null, unrefEntityType: null },
        })
        totalCleared++
        logger.info('[UNREF_CLEARED]', {
          fileId: file.id,
          entityId: file.unrefEntityId,
          reason: 'file-still-referenced',
        })
        continue
      }

      // ── File is genuinely absent → soft-delete DB + release usage ──────────
      try {
        await db.$transaction([
          db.vaultFile.update({
            where: { id: file.id },
            data: { status: 'DELETED', deletedAt: new Date() },
          }),
          db.vaultProjectUsage.update({
            where: {
              workspaceId_projectId: {
                workspaceId: file.workspaceId,
                projectId: file.projectId,
              },
            },
            data: {
              usedBytes: { decrement: file.sizeBytes },
              fileCount: { decrement: 1 },
            },
          }),
          db.vaultWorkspaceUsage.update({
            where: { workspaceId: file.workspaceId },
            data: {
              usedBytes: { decrement: file.sizeBytes },
              fileCount: { decrement: 1 },
            },
          }),
        ])
      } catch (err) {
        logger.error('[CLEANUP_DB_TRANSACTION_FAILED]', {
          fileId: file.id,
          err,
        })
        totalSkippedOnError++
        continue
      }

      // Log undo boundary expiry BEFORE S3 delete — this is the moment
      // the file is irrecoverably gone from the system's perspective.
      logger.info('[UNDO_WINDOW_EXPIRED]', {
        fileId: file.id,
        entityId: file.unrefEntityId,
        entityType: file.unrefEntityType,
        markedUnrefAt: file.unrefAt?.toISOString(),
        gracePeriodMs: GRACE_PERIOD_MS,
      })

      // ── Hard-delete from S3 ────────────────────────────────────────────────
      // DB is authoritative — the file is already DELETED from the user's
      // perspective. S3 delete is best-effort. If it fails, the object stays
      // in S3 but is inaccessible (no presigned URL will be issued for a
      // DELETED file). An S3 lifecycle rule should be the final safety net.
      logger.info('[S3_DELETE_REQUEST]', {
        fileId: file.id,
        s3Key: file.s3Key,
      })

      try {
        await deleteS3Object(file.s3Key)
        logger.info('[S3_DELETE_SUCCESS]', {
          fileId: file.id,
          s3Key: file.s3Key,
        })
      } catch (s3Err) {
        logger.error('[S3_DELETE_FAILED]', {
          fileId: file.id,
          s3Key: file.s3Key,
          err: s3Err,
        })
        // DO NOT re-increment totalDeleted — DB delete succeeded.
        // S3 orphan is a storage leak, not a data-integrity issue.
      }

      totalDeleted++
    }

    if (candidates.length < BATCH_SIZE) break
  }

  logger.info('[CLEANUP_JOB_COMPLETE]', {
    totalDeleted,
    totalCleared,
    totalSkippedOnError,
    gracePeriodMs: GRACE_PERIOD_MS,
    isFastMode: IS_FAST_MODE,
  })
}
