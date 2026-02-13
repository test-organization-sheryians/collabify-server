import { createQueue, createWorker, Job } from "@/services/bullmq";
import { db } from "@/infra/db";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("notification:engine:cleanup");

const CLEANUP_QUEUE_NAME = "notification-cleanup";

export const createCleanupCron = () => {
  const queue = createQueue(CLEANUP_QUEUE_NAME);

  // Run Daily at Midnight
  void queue.add(
    "prune-outbox",
    {},
    {
      repeat: {
        pattern: "0 0 * * *",
      },
    }
  );

  createWorker(CLEANUP_QUEUE_NAME, async (job: Job) => {
    logger.info("🧹 Running Cleanup Job: " + job.name, { jobId: job.id });

    if (job.name === "prune-outbox") {
      await CleanupEngine.pruneOutbox();
    }
  });

  logger.info("🧹 Cleanup Cron Scheduled");
};

/**
 * Cleanup Engine
 * Removes old data to prevent table bloat.
 */
export const CleanupEngine = {
  /**
   * Hard Delete completed Outbox events older than 7 days.
   */
  pruneOutbox: async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const result = await db.notificationOutbox.deleteMany({
      where: {
        status: "COMPLETED",
        createdAt: { lt: sevenDaysAgo },
      },
    });

    logger.info("Outbox Pruning Complete", { count: result.count });
  },

  /**
   * Optional: Prune old user notifications (e.g. > 30 days) if Policy allows.
   */
  pruneNotifications: async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Example: Only pruning READ notifications
    const result = await db.notification.deleteMany({
      where: {
        isRead: true,
        createdAt: { lt: thirtyDaysAgo },
      },
    });

    logger.info("Notification Pruning Complete", { count: result.count });
  },
};
