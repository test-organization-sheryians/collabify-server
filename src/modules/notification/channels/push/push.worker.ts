import { Job } from "bullmq";
import { createWorker } from "@/services/bullmq";
import { QUEUE_NAMES, REDIS_KEYS } from "../../core/constants";
import { PushJobData } from "../../core/types";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("notification:channel:push");
import { redis } from "@/infra/redis";
import { pushProvider } from "@/services/push-provider";
import { ProviderError } from "../../core/errors";

export const createPushWorker = () => {
  return createWorker<PushJobData>(
    QUEUE_NAMES.PUSH,
    async (job: Job<PushJobData>) => {
      const { userId, title, body, eventId } = job.data;

      const lockKey = `${REDIS_KEYS.IDEMPOTENCY_PREFIX}${eventId}:push`;
      const acquired = await redis.set(lockKey, "1", "EX", 86400, "NX");

      if (!acquired) {
        logger.debug("Duplicate Push Job Dropped", { eventId, userId });
        return;
      }

      logger.debug("Processing Push Notification", {
        jobId: job.id,
        userId,
        title,
      });

      try {
        // TODO: Integrate actual Push Provider (FCM/APNS)
        const stringData = job.data.data
          ? Object.fromEntries(
              Object.entries(job.data.data).map(([k, v]) => [k, String(v)])
            )
          : undefined;

        await pushProvider.send([userId], title, body, stringData);

        logger.info("Push Notification Sent (Simulated)", { eventId, userId });
      } catch (err: unknown) {
        throw new ProviderError("PUSH", err as Error);
      } finally {
        await redis.del(lockKey);
      }
    }
  );
};
