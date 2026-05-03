/**
 * Vault Jobs — Bootstrap
 *
 * Registers and starts all Vault BullMQ workers and scheduled jobs.
 * Call startVaultJobs(db) once during server startup, after DB is connected.
 *
 * Workers:
 *   vault-maintenance    — stale PENDING cleanup + unreferenced file cleanup (every 30 min)
 *   vault-entity-purge   — entity hard-delete purge (on-demand)
 */

import { createQueue } from "@/services/bullmq/queue.factory";
import { createWorker } from "@/services/bullmq/worker.factory";
import { createLogger } from "@/shared/lib/logger";
import { env } from "@/shared/config/env";
import type { PrismaClient } from "@prisma/client";
import { cleanupStalePendingUploads } from "./cleanup-pending";
import { cleanupUnreferencedFiles } from "./unreferenced-cleanup";
import { entityPurgeHandler } from "./entity-purge";
import type { EntityPurgePayload } from "./entity-purge";

const logger = createLogger("vault:jobs:index");

/** Published ref so other modules can enqueue entity purge jobs */
export const vaultEntityPurgeQueue = createQueue<EntityPurgePayload>(
  "vault-entity-purge"
);

const vaultMaintenanceQueue = createQueue("vault-maintenance");

/**
 * Job cadence — how often vault-maintenance jobs are scheduled.
 *
 * Production: always 30 minutes.
 * Dev/test  : override via VAULT_CLEANUP_INTERVAL_MS (e.g. 15000 = 15s)
 *             so the lifecycle can be exercised end-to-end in under a minute.
 */
const CLEANUP_INTERVAL_MS =
  env.NODE_ENV !== "production" && env.VAULT_CLEANUP_INTERVAL_MS
    ? env.VAULT_CLEANUP_INTERVAL_MS
    : 30 * 60 * 1000;

const IS_FAST_MODE =
  env.NODE_ENV !== "production" && Boolean(env.VAULT_CLEANUP_INTERVAL_MS);

export async function startVaultJobs(db: PrismaClient): Promise<void> {
  logger.info("Starting Vault workers and maintenance jobs");

  // ── Stale PENDING cleanup worker (C-B4) ───────────────────────────────────
  createWorker<Record<string, never>>(
    "vault-maintenance",
    async (job) => {
      if (job.name === "cleanup-pending") {
        await cleanupStalePendingUploads(db);
      } else if (job.name === "cleanup-unreferenced") {
        await cleanupUnreferencedFiles(db);
      }
    },
    { concurrency: 1 }
  );

  // Schedule the repeatable cleanup jobs (idempotent — same jobId prevents duplicates)
  await vaultMaintenanceQueue.add(
    "cleanup-pending",
    {},
    {
      repeat: { every: CLEANUP_INTERVAL_MS },
      jobId: "vault-cleanup-pending-repeatable",
    }
  );

  await vaultMaintenanceQueue.add(
    "cleanup-unreferenced",
    {},
    {
      repeat: { every: CLEANUP_INTERVAL_MS },
      jobId: "vault-cleanup-unreferenced-repeatable",
    }
  );

  // ── Entity purge worker (C-B5) ─────────────────────────────────────────────
  const purgeHandler = await entityPurgeHandler(db);
  createWorker<EntityPurgePayload>("vault-entity-purge", purgeHandler, {
    concurrency: 5,
  });

  logger.info("[VAULT_JOBS_STARTED]", {
    workers: ["vault-maintenance", "vault-entity-purge"],
    cleanupIntervalMs: CLEANUP_INTERVAL_MS,
    isFastMode: IS_FAST_MODE,
    cronJobs: [
      `cleanup-pending (every ${CLEANUP_INTERVAL_MS / 1000}s)`,
      `cleanup-unreferenced (every ${CLEANUP_INTERVAL_MS / 1000}s)`,
    ],
  });
}
