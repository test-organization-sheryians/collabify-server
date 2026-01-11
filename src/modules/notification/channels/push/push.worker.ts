import { Job } from "bullmq";
import { createWorker } from "@/services/bullmq";
import { QUEUE_NAMES, REDIS_KEYS } from "../../core/constants";
import { PushJobData } from "../../core/types";
import { logger } from "@/shared/logger";
import { redis } from "@/infra/redis";
import { pushProvider } from "@/services/push-provider";
// import { pushProvider } from "@/services/push"; // Future integration

export const createPushWorker = () => {
  return createWorker<PushJobData>(
    QUEUE_NAMES.PUSH,
    async (job: Job<PushJobData>) => {
      const { userId, title, body, eventId } = job.data;

      const lockKey = `${REDIS_KEYS.IDEMPOTENCY_PREFIX}${eventId}:push`;
      const acquired = await redis.set(lockKey, "1", "EX", 86400, "NX");

      if (!acquired) {
        logger.debug({ eventId, userId }, "Duplicate Push Job Dropped");
        return;
      }

      logger.debug(
        { jobId: job.id, userId, title },
        "Processing Push Notification"
      );

      try {
        // TODO: Integrate actual Push Provider (FCM/APNS)
        await pushProvider.send([userId], title, body, job.data.data);

        logger.info({ eventId, userId }, "Push Notification Sent (Simulated)");
      } catch (err: any) {
        logger.error({ err, userId }, "Failed to send Push Notification");
        // throw err; // Retry logic relies on this
      } finally {
        await redis.del(lockKey);
      }
    }
  );
};
