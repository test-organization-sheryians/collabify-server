import { createQueue, createWorker } from "@/services/bullmq";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/infra/db";

const logger = createLogger("notification:engine:recovery");

const RECOVERY_QUEUE_NAME = "outbox-recovery-cron";

/** Events stuck in PROCESSING for longer than this are considered zombies. */
const ZOMBIE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export const createRecoveryCron = () => {
  const queue = createQueue(RECOVERY_QUEUE_NAME);

  void queue.add(
    "recover-zombies",
    {},
    { repeat: { pattern: "* * * * *" } } // Every minute
  );

  createWorker(RECOVERY_QUEUE_NAME, async () => {
    logger.debug("🧟 Running Zombie Job Recovery...");

    // Events that have been stuck in PROCESSING since before the cutoff
    // are treated as zombies (worker crashed mid-processing).
    const cutoff = new Date(Date.now() - ZOMBIE_THRESHOLD_MS);

    const result = await db.notificationOutbox.updateMany({
      where: {
        status:    "PROCESSING",
        createdAt: { lt: cutoff },
      },
      data: { status: "PENDING", processedAt: null },
    });

    if (result.count > 0) {
      logger.warn("🧟 Revived stuck outbox events", { count: result.count });
    }
  });

  logger.info("🧟 Outbox Recovery Cron Scheduled");
};
