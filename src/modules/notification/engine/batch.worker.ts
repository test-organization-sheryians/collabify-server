import { Job } from "bullmq";
import { createWorker, createQueue } from "@/services/bullmq";
import { QUEUE_NAMES, REDIS_KEYS } from "../core/constants";
import { DeciderJobData } from "../core/types";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("notification:engine:batch");
import { redis } from "@/infra/redis";

interface BatchJobData {
  type: string;
  userId: string;
  payload: Record<string, unknown>;
  eventId: string;
}

const deciderQueue = createQueue<DeciderJobData>(QUEUE_NAMES.DECIDER);

export const createBatchWorker = () => {
  return createWorker<BatchJobData>(
    QUEUE_NAMES.BATCH,
    async (job: Job<BatchJobData>) => {
      const { type, userId, eventId } = job.data;

      const bufferKey = `batch:${type}:${userId}`;

      await redis.rpush(bufferKey, JSON.stringify(job.data));
      await redis.expire(bufferKey, 3600);

      const lockKey = `${REDIS_KEYS.IDEMPOTENCY_PREFIX}batch-proc:${type}:${userId}`;
      const acquired = await redis.set(lockKey, "1", "EX", 30, "NX");

      if (!acquired) {
        return;
      }

      const rawItems = await redis.lrange(bufferKey, 0, -1);
      if (!rawItems.length) return;

      await redis.del(bufferKey);

      const items = rawItems.map((s) => JSON.parse(s));

      logger.info("Aggregating Notification Batch", {
        userId,
        count: items.length,
      });

      const summaryPayload = {
        itemCount: items.length,
        items: items.map((i: BatchJobData) => i.payload),
        recipientId: userId,
        ...items[0].payload,
      };

      const summaryType = `${type}.summary`;

      await deciderQueue.add(summaryType, {
        eventId: `summary-${eventId}`,
        type: summaryType,
        payload: summaryPayload,
        createdAt: new Date(),
      });
    }
  );
};
