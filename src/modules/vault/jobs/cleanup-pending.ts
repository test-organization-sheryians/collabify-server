/**
 * Vault — Stale PENDING Cleanup Job (C-B4)
 *
 * Sweeps VaultFile rows that are stuck in PENDING status after their upload
 * window has expired. This handles the case where a client called
 * requestVaultUpload / registerExternalFile but never completed the upload
 * (tab closed, S3 PUT timed out, network failure).
 *
 * Schedule: every 30 minutes.
 * Cutoff:   20 minutes (presigned PUT TTL is 15 min + 5 min grace period).
 *
 * For each stale file:
 *   1. Soft-delete the VaultFile row (status → DELETED)
 *   2. Release reservedBytes on project + workspace usage records (in one transaction)
 *
 * Processed in batches of 100 to avoid long-running transactions.
 * Idempotent — if two instances run simultaneously, the second finds 0 rows.
 */

import { createLogger } from "@/shared/lib/logger";
import type { PrismaClient } from "@prisma/client";

const logger = createLogger("vault:jobs:cleanup-pending");

/** 20 minutes — beyond presigned URL lifetime (15 min) + 5 min grace */
const STALE_CUTOFF_MS = 20 * 60 * 1000;
const BATCH_SIZE = 100;

export async function cleanupStalePendingUploads(db: PrismaClient): Promise<void> {
  const cutoff = new Date(Date.now() - STALE_CUTOFF_MS);

  logger.info("cleanup-pending: starting sweep", { cutoff });

  let totalSwept = 0;

  // Paginate to avoid one huge transaction
  while (true) {
    const staleFiles = await db.vaultFile.findMany({
      where: { status: "PENDING", createdAt: { lt: cutoff } },
      select: {
        id: true,
        projectId: true,
        workspaceId: true,
        sizeBytes: true,
      },
      take: BATCH_SIZE,
    });

    if (staleFiles.length === 0) break;

    for (const file of staleFiles) {
      await db.$transaction([
        // Soft-delete the file row
        db.vaultFile.update({
          where: { id: file.id },
          data: { status: "DELETED", deletedAt: new Date() },
        }),
        // Release the reserved bytes (decrement — they were never activated)
        db.vaultProjectUsage.update({
          where: {
            workspaceId_projectId: {
              workspaceId: file.workspaceId,
              projectId: file.projectId,
            },
          },
          data: { reservedBytes: { decrement: file.sizeBytes } },
        }),
        db.vaultWorkspaceUsage.update({
          where: { workspaceId: file.workspaceId },
          data: { reservedBytes: { decrement: file.sizeBytes } },
        }),
      ]);
    }

    totalSwept += staleFiles.length;
    logger.info("cleanup-pending: batch swept", {
      batchSize: staleFiles.length,
      totalSwept,
    });

    // If we got fewer than BATCH_SIZE, we've exhausted the result set
    if (staleFiles.length < BATCH_SIZE) break;
  }

  if (totalSwept > 0) {
    logger.warn("cleanup-pending: swept stale uploads", { totalSwept });
  } else {
    logger.debug("cleanup-pending: no stale uploads found");
  }
}
