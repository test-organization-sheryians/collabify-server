/**
 * Vault — Entity Purge Cleanup Job (C-B5)
 *
 * Soft-deletes VaultFile rows associated with a hard-deleted entity
 * (e.g., a chat message hard-purge, an issue delete, a project delete).
 *
 * Triggered by delete handlers in other modules via vaultEntityPurgeQueue.add().
 *
 * Job payload: { source, sourceId }
 *   source:   'CHAT' | 'PAGE' | 'WHITEBOARD' | 'TASK'
 *   sourceId: the deleted entity's ID
 *
 * For each ACTIVE VaultFile where source+sourceId match:
 *   1. Soft-delete (status → DELETED)
 *   2. Release usedBytes from project + workspace usage (in one transaction)
 *
 * Idempotent — retry-safe because we only process status=ACTIVE files.
 * BullMQ retry: 3 attempts with exponential back-off.
 */

import { createLogger } from "@/shared/lib/logger";
import type { PrismaClient, VaultFileSource } from "@prisma/client";
import type { Job } from "bullmq";

const logger = createLogger("vault:jobs:entity-purge");

export interface EntityPurgePayload {
  source: Exclude<VaultFileSource, "VAULT">;
  sourceId: string;
}

export async function entityPurgeHandler(
  db: PrismaClient
): Promise<(job: Job<EntityPurgePayload>) => Promise<void>> {
  return async (job: Job<EntityPurgePayload>) => {
    const { source, sourceId } = job.data;

    logger.info("entity-purge: starting", { source, sourceId });

    // Find all ACTIVE files for this entity
    const files = await db.vaultFile.findMany({
      where: { source, sourceId, status: "ACTIVE" },
      select: {
        id: true,
        projectId: true,
        workspaceId: true,
        sizeBytes: true,
        s3Key: true,
      },
    });

    if (files.length === 0) {
      logger.debug("entity-purge: no active files found", { source, sourceId });
      return;
    }

    logger.info("entity-purge: purging files", {
      source,
      sourceId,
      count: files.length,
    });

    for (const file of files) {
      await db.$transaction([
        db.vaultFile.update({
          where: { id: file.id },
          data: { status: "DELETED", deletedAt: new Date() },
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
      ]);
      // S3 deletion is eventual — object lifecycle rules or a future s3-delete job
      // handles the actual byte removal from the bucket.
    }

    logger.info("entity-purge: done", { source, sourceId, purged: files.length });
  };
}
