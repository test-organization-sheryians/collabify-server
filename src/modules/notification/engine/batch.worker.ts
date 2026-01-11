import { Job } from "bullmq";
import { createWorker, createQueue } from "@/services/bullmq";
import { QUEUE_NAMES, REDIS_KEYS } from "../core/constants";
import { DeciderJobData } from "../core/types";
import { logger } from "@/shared/logger";
import { redis } from "@/infra/redis";

interface BatchJobData {
  type: string;
  userId: string;
  payload: any;
  eventId: string;
}

const deciderQueue = createQueue<DeciderJobData>(QUEUE_NAMES.DECIDER);

export const createBatchWorker = () => {
  return createWorker<BatchJobData>(
    QUEUE_NAMES.BATCH,
    async (job: Job<BatchJobData>) => {
      const { type, userId, payload, eventId } = job.data;

      // 1. Buffer Key (Keyed by User + Type, e.g., "batch:task.update:user-123")
      // We assume a fixed window of e.g. 5 minutes for this implementation or rely on job delay
      const bufferKey = `batch:${type}:${userId}`;

      // 2. Add to Redis List
      await redis.rpush(bufferKey, JSON.stringify(job.data));
      // Set expiry to ensure no stale data if worker crashes before processing
      await redis.expire(bufferKey, 3600);

      // 3. Check effectively if this is the "trigger" job
      // In a real system we might use a Delayed Job as the trigger,
      // but for simplicity here we can just rely on the queue delay itself if passed options.delay

      // For this implementation, we will act as an "Aggregation Trigger"
      // attempting to consume the list.

      // To prevent race conditions (multiple jobs running for same user), we set a lock
      const lockKey = `${REDIS_KEYS.IDEMPOTENCY_PREFIX}batch-proc:${type}:${userId}`;
      const acquired = await redis.set(lockKey, "1", "EX", 30, "NX"); // 30s processing lock

      if (!acquired) {
        // Another worker is already aggregating for this user/type, or we are within the accumulation window
        // If we want to support "Wait 5 mins AFTER first event", the first event should have been delayed.
        // If this job itself was delayed, then we proceed.
        return;
      }

      // 4. Aggregate
      const rawItems = await redis.lrange(bufferKey, 0, -1);
      if (!rawItems.length) return;

      // Clear the buffer
      await redis.del(bufferKey);

      const items = rawItems.map((s) => JSON.parse(s));

      logger.info(
        { userId, count: items.length },
        "Aggregating Notification Batch"
      );

      // 5. Create Summary Notification
      // Use the first event's ID as the base, or generate new
      const summaryPayload = {
        itemCount: items.length,
        items: items.map((i: any) => i.payload), // Pass full payloads for template to use
        recipientId: userId,
        // Common context from first event
        ...items[0].payload,
      };

      // 6. Send BACK to Decider (but as a SINGLE Summary Event)
      // This requires the 'type' to handle summary payloads, OR we use a special summary type
      // For now, let's assume the template for 'type' can handle { itemCount, items }
      // OR we convention suffixes like 'task.update.summary'

      const summaryType = `${type}.summary`; // Convention for now

      await deciderQueue.add(summaryType, {
        eventId: `summary-${eventId}`,
        type: summaryType,
        payload: summaryPayload,
        createdAt: new Date(),
      });
    }
  );
};
