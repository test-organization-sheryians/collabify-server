import { Redis } from "ioredis";
import { env } from "@/shared/config/env";

/**
 * Creates a Redis connection optimized for BullMQ.
 * BullMQ requires `maxRetriesPerRequest: null`.
 */
export const createConnection = () =>
  new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    connectionName: "bullmq-redis",
    enableReadyCheck: false,
  });
