/**
 * Vault Jobs — Bootstrap
 *
 * Registers and starts all Vault BullMQ workers and scheduled jobs.
 * Call startVaultJobs(db) once during server startup, after DB is connected.
 *
 * Workers:
 *   vault-maintenance    — stale PENDING cleanup  (every 30 min)
 *   vault-entity-purge   — entity hard-delete purge (on-demand)
 */

import { createQueue } from "@/services/bullmq/queue.factory";
import { createWorker } from "@/services/bullmq/worker.factory";
import { createLogger } from "@/shared/lib/logger";
import type { PrismaClient } from "@prisma/client";
import { cleanupStalePendingUploads } from "./cleanup-pending";
import { entityPurgeHandler } from "./entity-purge";
import type { EntityPurgePayload } from "./entity-purge";

const logger = createLogger("vault:jobs:index");

/** Published ref so other modules can enqueue entity purge jobs */
export const vaultEntityPurgeQueue = createQueue<EntityPurgePayload>(
  "vault-entity-purge"
);

const vaultMaintenanceQueue = createQueue("vault-maintenance");

/** Every 30 minutes */
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000;

export async function startVaultJobs(db: PrismaClient): Promise<void> {
  logger.info("Starting Vault workers and maintenance jobs");

  // ── Stale PENDING cleanup worker (C-B4) ───────────────────────────────────
  createWorker<Record<string, never>>(
    "vault-maintenance",
    async () => {
      await cleanupStalePendingUploads(db);
    },
    { concurrency: 1 }
  );

  // Schedule the repeatable cleanup job (idempotent — same jobId prevents duplicates)
  await vaultMaintenanceQueue.add(
    "cleanup-pending",
    {},
    {
      repeat: { every: CLEANUP_INTERVAL_MS },
      jobId: "vault-cleanup-pending-repeatable",
    }
  );

  // ── Entity purge worker (C-B5) ─────────────────────────────────────────────
  const purgeHandler = await entityPurgeHandler(db);
  createWorker<EntityPurgePayload>("vault-entity-purge", purgeHandler, {
    concurrency: 5,
  });

  logger.info("Vault workers started", {
    workers: ["vault-maintenance", "vault-entity-purge"],
    cronJobs: [`cleanup-pending (every ${CLEANUP_INTERVAL_MS / 60000}min)`],
  });
}
