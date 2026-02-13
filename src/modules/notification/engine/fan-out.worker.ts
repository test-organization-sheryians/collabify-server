import { Job } from "bullmq";
import { createWorker, createQueue } from "@/services/bullmq";
import { QUEUE_NAMES, REDIS_KEYS } from "../core/constants";
import { db } from "@/infra/db";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("notification:engine:fan-out");
import { DeciderJobData } from "../core/types";
import { redis } from "@/infra/redis";

const BATCH_SIZE = 100;
const deciderQueue = createQueue<DeciderJobData>(QUEUE_NAMES.DECIDER);
const fanOutQueue = createQueue(QUEUE_NAMES.FANOUT);

interface FanOutJobData {
  type: string;
  payload: Record<string, unknown>;
  query?: Record<string, unknown>;
  offset?: number;
}

export const createFanOutWorker = () => {
  return createWorker<FanOutJobData>(
    QUEUE_NAMES.FANOUT,
    async (job: Job<FanOutJobData>) => {
      const { type, payload, offset = 0 } = job.data;
      const jobIdSafe = job.id || `unknown-${offset}`; // BullMQ jobs should have IDs

      // 0. Idempotency Check
      const lockKey = `${REDIS_KEYS.IDEMPOTENCY_PREFIX}fanout:${jobIdSafe}`;
      const acquired = await redis.set(lockKey, "1", "EX", 86400, "NX");

      if (!acquired) {
        logger.debug("Duplicate FanOut Chunk Dropped", {
          jobId: job.id,
          offset,
        });
        return;
      }

      logger.debug("Processing FanOut Chunk", { jobId: job.id, offset });

      const users = await db.user.findMany({
        select: { id: true },
        take: BATCH_SIZE,
        skip: offset,
        orderBy: { id: "asc" },
      });

      if (users.length === 0) {
        logger.info("FanOut Complete", { type, totalProcessed: offset });
        return;
      }

      const jobs = users.map((user) => ({
        name: type,
        data: {
          eventId: `fanout-${jobIdSafe}-${user.id}`, // Guaranteed unique per user/job
          type,
          payload: { ...payload, recipientId: user.id },
          createdAt: new Date(),
        },
        opts: {
          // Inherit defaults but be explicit
          removeOnComplete: true,
        },
      }));

      await deciderQueue.addBulk(jobs);

      // Continue FanOut
      await fanOutQueue.add(type, {
        ...job.data,
        offset: offset + BATCH_SIZE,
      });

      logger.debug("FanOut Chunk Processed", { count: users.length });
    }
  );
};
