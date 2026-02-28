/**
 * Reaction System Job Configuration
 *
 * Schedules:
 * 1. Persistence worker (on-demand via stream)
 * 2. Reconciliation job (every 6 hours)
 */

import type { Job } from "bullmq";
import { createWorker } from "@/services/bullmq/worker.factory";
import { createQueue } from "@/services/bullmq/queue.factory";
import {
  persistReactionsHandler,
  type PersistReactionsJob,
} from "./persist-reactions";
import { reconcileReactionsHandler } from "./reconcile-reactions";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("chat:jobs:reaction-jobs");

/**
 * Initialize all reaction-related workers and scheduled jobs
 */
export const startReactionJobs = async (): Promise<void> => {
  // 1. Persistence Worker (on-demand)
  const persistenceWorker = createWorker(
    "chat-reactions",
    async (job) => {
      if (job.name === "persist-reactions") {
        return persistReactionsHandler(job as Job<PersistReactionsJob>);
      }
      throw new Error(`Unknown reaction job: ${job.name}`);
    },
    { concurrency: 5 }
  );

  logger.info("Reaction persistence worker started");

  // 2. Reconciliation Worker (scheduled)
  const reconcileWorker = createWorker(
    "reaction-reconcile",
    reconcileReactionsHandler,
    { concurrency: 1 } // Only 1 at a time to avoid conflicts
  );

  logger.info("Reaction reconciliation worker started");

  // 3. Schedule Reconciliation Job (every 6 hours)
  const reconcileQueue = createQueue("reaction-reconcile");

  await reconcileQueue.add(
    "reconcile",
    { forceRebuild: false },
    {
      repeat: {
        pattern: "0 */6 * * *", // Every 6 hours
      },
      jobId: "reaction-reconcile-scheduled", // Prevent duplicates
    }
  );

  logger.info("Reaction reconciliation scheduled (every 6 hours)");
};
