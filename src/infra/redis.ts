import Redis from "ioredis";
import { createLogger } from "../shared/lib/logger";
import { env } from "../shared/config/env";

const logger = createLogger("infra:redis");
const REDIS_URL = env.REDIS_URL || "redis://localhost:6379";

const createClient = (name: string) => {
  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null, // Required for BullMQ & blocking commands
    enableReadyCheck: false,
    retryStrategy: (times) => Math.min(times * 50, 2000),
    connectionName: name,
  });

  client.on("error", (err) => {
    logger.error("Redis connection error", { err, name });
  });

  client.on("connect", () => {
    logger.info("Redis connected", { name });
  });

  return client;
};

// 1. General Application Redis (Caching, simple commands, non-blocking)
export const appRedis = createClient("bun-app-redis");

// 2. Dedicated Subscriber (Pub/Sub listening only)
export const subRedis = createClient("bun-sub-redis");

// 3. Blocking Publisher / Stream Worker (XREADGROUP, XADD, etc)
export const bpubRedis = createClient("bun-bpub-redis");

// Compatibility Alias (keeps existing code working)
export const redis = appRedis;
