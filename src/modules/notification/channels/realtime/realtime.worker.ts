import { Job } from "bullmq";
import { createWorker } from "@/services/bullmq";
import { QUEUE_NAMES } from "../../core/constants";
import { logger } from "@/shared/logger";
import { redis } from "@/infra/redis";

interface RealTimeJobData {
  eventId: string;
  userId: string;
  type: string;
  payload: Record<string, unknown>;
}

export const createRealTimeWorker = () => {
  return createWorker<RealTimeJobData>(
    QUEUE_NAMES.REALTIME,
    async (job: Job<RealTimeJobData>) => {
      const { userId, type, payload } = job.data;

      // Publish to Redis Channel for WebSocket Server
      // Channel Pattern: "user:{userId}"
      const channel = `user:${userId}`;
      const message = JSON.stringify({
        type,
        payload,
        timestamp: new Date().toISOString(),
      });

      await redis.publish(channel, message);

      logger.debug({ userId, type, channel }, "📡 RealTime Event Published");
    }
  );
};
