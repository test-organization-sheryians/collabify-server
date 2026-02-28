import { createWorker } from "@/services/bullmq/worker.factory";
import { persistMessageHandler } from "./persist-message";
import { persistMessageEditWorker } from "./persist-message-edit";
import { persistMessageDeleteWorker } from "./persist-message-delete";
import { cleanupOutboxHandler } from "./cleanup-outbox";
import { recoverStuckOutboxHandler } from "./recover-stuck-outbox";
import { startReactionJobs } from "./reaction-jobs";
import { readReceiptHandler } from "./batch-read-receipts";
import { maintenanceQueue } from "./queues";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("chat:jobs:index");

export const startChatWorkers = async () => {
  // Persistence Worker (Critical for Chat Arch)
  createWorker("chat-persistence", persistMessageHandler, {
    concurrency: 5, // Process 5 messages in parallel
  });

  // Edit Message Persistence Worker
  createWorker("persist-message-edit", persistMessageEditWorker, {
    concurrency: 3,
  });

  // Delete Message Persistence Worker
  createWorker("persist-message-delete", persistMessageDeleteWorker, {
    concurrency: 3,
  });

  // ═══════════════════════════════════════════════════════════
  // Read Receipts Worker (Batched Persistence)
  // ═══════════════════════════════════════════════════════════

  createWorker("chat-read-receipts", readReceiptHandler, {
    concurrency: 10, // Process 10 read receipts in parallel
  });

  // ═══════════════════════════════════════════════════════════
  // Maintenance Workers (Resilience jobs for production health)
  // ═══════════════════════════════════════════════════════════

  // Cleanup Job Worker
  createWorker("cleanup-outbox", cleanupOutboxHandler, {
    concurrency: 1, // Only 1 cleanup job at a time
  });

  // Recovery Job Worker
  createWorker("recover-stuck-outbox", recoverStuckOutboxHandler, {
    concurrency: 1, // Only 1 recovery job at a time
  });

  // ═══════════════════════════════════════════════════════════
  // Schedule Cron Jobs
  // ═══════════════════════════════════════════════════════════

  // Cleanup Job: Every 6 hours (at 00:00, 06:00, 12:00, 18:00)
  await maintenanceQueue.add(
    "cleanup-outbox",
    {},
    {
      repeat: {
        pattern: "0 */6 * * *", // Cron: every 6 hours
      },
      jobId: "cleanup-outbox-cron", // Prevent duplicates
      removeOnComplete: true,
      removeOnFail: false,
    }
  );

  // Recovery Job: Every 2 minutes
  await maintenanceQueue.add(
    "recover-stuck-outbox",
    {},
    {
      repeat: {
        pattern: "*/2 * * * *", // Cron: every 2 minutes
      },
      jobId: "recover-stuck-outbox-cron", // Prevent duplicates
      removeOnComplete: true,
      removeOnFail: false,
    }
  );

  // ═══════════════════════════════════════════════════════════
  // Reaction System Jobs
  // ═══════════════════════════════════════════════════════════

  await startReactionJobs();

  logger.info("Chat workers and maintenance jobs started", {
    workers: [
      "chat-persistence",
      "persist-message-edit",
      "persist-message-delete",
      "chat-read-receipts",
      "chat-reactions",
      "reaction-reconcile",
    ],
    cronJobs: [
      "cleanup-outbox (every 6h)",
      "recover-stuck-outbox (every 2min)",
      "reaction-reconcile (every 6h)",
    ],
  });
};
