import { Job } from "bullmq";
import { createWorker } from "@/services/bullmq";
import { emailProvider } from "@/services/email-provider";
import { QUEUE_NAMES, REDIS_KEYS } from "../../core/constants";
import { EmailJobData } from "../../core/types";
import { logger } from "@/shared/logger";
import { ProviderError } from "../../core/errors";
import { redis } from "@/infra/redis";

export const createEmailWorker = () => {
  return createWorker<EmailJobData>(
    QUEUE_NAMES.EMAIL,
    async (job: Job<EmailJobData>) => {
      const { html, subject, to, eventId, userId } = job.data;

      const lockKey = `${REDIS_KEYS.IDEMPOTENCY_PREFIX}${eventId}:email`;
      const acquired = await redis.set(lockKey, "1", "EX", 86400, "NX");

      if (!acquired) {
        logger.debug({ eventId, userId }, "Duplicate Email Job Dropped");
        return;
      }

      logger.debug({ jobId: job.id, userId }, "Processing Email Delivery");

      try {
        await emailProvider.send(to, subject, html);
        logger.info({ eventId, to }, "Email Delivered");
      } catch (err: unknown) {
        throw new ProviderError("EMAIL", err as Error);
      }
    }
  );
};
