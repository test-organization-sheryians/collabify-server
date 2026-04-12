import { createLogger } from "@/shared/lib/logger";
// Load all event handlers — must be first, before any worker starts
import "../events/load-all";
import { OutboxPoller } from "./outbox-poller";
import { createDeciderWorker } from "./decider.worker";
import { createFanoutWorker } from "./fan-out.worker";
import { createBatchWorker } from "./batch.worker";
import { createEmailWorker } from "../channels/email/email.worker";
import { createInAppWorker } from "../channels/in-app/in-app.worker";
import { createPushWorker } from "../channels/push/push.worker";
import { createRealtimeWorker } from "../channels/realtime/realtime.worker";
import { createCleanupCron } from "./cleanup.cron";
import { createRecoveryCron } from "./recovery.cron";

// =============================================================================
// Notification Engine Bootstrap
//
// Wire all workers and start the OutboxPoller.
// Called once at server startup by NotificationModule.startEngine().
//
// Worker startup order matters:
//   Channel workers first → they consume from queues the Decider produces.
//   Then Engine workers → Decider, Fanout, Batch.
//   OutboxPoller last  → starts feeding events into the pipeline.
//
// Workers are long-lived — they run for the lifetime of the process.
// =============================================================================

const logger = createLogger("notification:engine:bootstrap");

export const startEngine = async (): Promise<void> => {
  logger.info("Notification Engine: initializing workers...");

  // ── 1. Channel workers (consumers) ──────────────────────────────────────
  const emailWorker    = createEmailWorker();
  const inAppWorker    = createInAppWorker();
  const pushWorker     = createPushWorker();
  const realtimeWorker = createRealtimeWorker();

  // ── 2. Engine workers (orchestration) ───────────────────────────────────
  const deciderWorker = createDeciderWorker();
  const fanoutWorker  = createFanoutWorker();
  const batchWorker   = createBatchWorker();

  // ── 3. Graceful shutdown (process-level) ─────────────────────────────────
  const allWorkers = [
    emailWorker,
    inAppWorker,
    pushWorker,
    realtimeWorker,
    deciderWorker,
    fanoutWorker,
    batchWorker,
  ];

  const gracefulShutdown = async (signal: string) => {
    logger.info(`Notification Engine: ${signal} received — closing workers`, {
      count: allWorkers.length,
    });
    await Promise.allSettled(allWorkers.map((w) => w.close()));
    logger.info("Notification Engine: shutdown complete");
  };

  process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.once("SIGINT",  () => gracefulShutdown("SIGINT"));

  // ── 4. OutboxPoller — last, after workers are ready to consume ───────────
  await OutboxPoller.start();

  // ── 5. Background crons (fire-and-forget, not in graceful shutdown list) ──
  createCleanupCron();
  createRecoveryCron();

  logger.info("Notification Engine: all workers running ✅", {
    workers: allWorkers.map((w) => w.name),
  });
};
