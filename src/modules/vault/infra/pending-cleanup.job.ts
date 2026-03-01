/**
 * Vault — Pending Upload Cleanup Job
 *
 * Runs periodically to clean up orphaned PENDING VaultFile rows.
 * A PENDING file is "orphaned" when the client started an upload but never
 * called confirmVaultUpload within the TTL window (15 min).
 *
 * Actions:
 *   1. Find PENDING files older than 30 minutes
 *   2. Release their reservedBytes from both UsageRecord rows
 *   3. Soft-delete the orphaned file rows
 *
 * Designed to be called by a cron scheduler (e.g. node-cron or BullMQ).
 * Must not be called concurrently (use a distributed lock or single instance).
 */

import type { PrismaClient } from "@prisma/client";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("vault:infra:pending-cleanup");

const PENDING_TTL_MS = 30 * 60 * 1000; // 30 minutes

export async function runPendingCleanup(db: PrismaClient): Promise<void> {
  const cutoff = new Date(Date.now() - PENDING_TTL_MS);

  const orphaned = await db.vaultFile.findMany({
    where: {
      status: "PENDING",
      createdAt: { lt: cutoff },
      deletedAt: null,
    },
    select: {
      id: true,
      projectId: true,
      workspaceId: true,
      sizeBytes: true,
    },
  });

  if (orphaned.length === 0) {
    logger.info("No orphaned PENDING uploads found");
    return;
  }

  logger.info(`Cleaning up ${orphaned.length} orphaned PENDING uploads`);

  for (const file of orphaned) {
    try {
      await db.$transaction([
        // Soft-delete the orphaned PENDING file
        db.vaultFile.update({
          where: { id: file.id },
          data: { deletedAt: new Date() },
        }),
        // Release reservedBytes from project usage record
        db.vaultProjectUsage.update({
          where: {
            workspaceId_projectId: {
              workspaceId: file.workspaceId,
              projectId: file.projectId,
            },
          },
          data: { reservedBytes: { decrement: file.sizeBytes } },
        }),
        // Release reservedBytes from workspace usage record
        db.vaultWorkspaceUsage.update({
          where: { workspaceId: file.workspaceId },
          data: { reservedBytes: { decrement: file.sizeBytes } },
        }),
      ]);
    } catch (err) {
      logger.error("Failed to clean up orphaned PENDING file", {
        fileId: file.id,
        err,
      });
      // Continue with remaining files — don't abort the whole cleanup
    }
  }

  logger.info(`Cleanup complete`, { count: orphaned.length });
}
