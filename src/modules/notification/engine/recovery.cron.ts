import { createQueue, createWorker } from "@/services/bullmq";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("notification:engine:recovery");
import { db } from "@/infra/db";

const RECOVERY_QUEUE_NAME = "outbox-recovery-cron";

export const createRecoveryCron = () => {
  const queue = createQueue(RECOVERY_QUEUE_NAME);

  // Add the repeatable job (runs every Minute)
  void queue.add(
    "recover-zombies",
    {},
    {
      repeat: {
        pattern: "* * * * *", // Every minute
      },
    }
  );

  createWorker(RECOVERY_QUEUE_NAME, async () => {
    logger.debug("🧟 Running Zombie Job Recovery...");

    // Reset stuck jobs older than 5 minutes
    const result = await db.$queryRawUnsafe<{ id: string }[]>(`
        UPDATE "notification_outbox" 
        SET status = 'PENDING', "processed_at" = NULL 
        WHERE status = 'PROCESSING' 
        AND "created_at" < NOW() - INTERVAL '5 minutes'
        RETURNING id;
    `);

    if (result.length > 0) {
      logger.warn("🧟 revived stuck outbox events!", {
        count: result.length,
        ids: result.map((r) => r.id),
      });
    }
  });

  logger.info("🧟 Outbox Recovery Cron Scheduled");
};
