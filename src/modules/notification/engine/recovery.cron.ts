import { createQueue, Job } from "@/services/bullmq";
import { logger } from "@/shared/logger";
import { db } from "@/infra/db";

const RECOVERY_QUEUE_NAME = "outbox-recovery-cron";

export const createRecoveryCron = () => {
  const queue = createQueue(RECOVERY_QUEUE_NAME);

  // Add the repeatable job (runs every Minute)
  queue.add(
    "recover-zombies",
    {},
    {
      repeat: {
        pattern: "* * * * *", // Every minute
      },
    }
  );

  // We need a worker to process this "tick" and run the DB cleanup
  const { createWorker } = require("@/services/bullmq"); // Lazy import to avoid cycle if any

  createWorker(RECOVERY_QUEUE_NAME, async (job: Job) => {
    logger.debug("🧟 Running Zombie Job Recovery...");

    // Reset stuck jobs older than 5 minutes
    const result = await db.$queryRawUnsafe<any[]>(`
        UPDATE "notification_outbox" 
        SET status = 'PENDING', "processed_at" = NULL 
        WHERE status = 'PROCESSING' 
        AND "created_at" < NOW() - INTERVAL '5 minutes'
        RETURNING id;
    `);

    if (result.length > 0) {
      logger.warn(
        { count: result.length, ids: result.map((r) => r.id) },
        "🧟 revived stuck outbox events!"
      );
    }
  });

  logger.info("🧟 Outbox Recovery Cron Scheduled");
};
