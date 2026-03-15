import Redis from "ioredis";
import { createLogger } from "../shared/lib/logger";
import { env } from "../shared/config/env";

const logger = createLogger("infra:redis");
const REDIS_URL = env.REDIS_URL || "redis://localhost:6379";

const createClient = (name: string, enableReadyCheck = true) => {
  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null, // Required for BullMQ & blocking commands
    enableReadyCheck,
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
// enableReadyCheck: true (default) — prevents auth cache commands before Redis is ready
export const appRedis = createClient("bun-app-redis");

// 2. Dedicated Subscriber (Pub/Sub listening only)
// enableReadyCheck: false — required for blocking pub/sub subscribe calls
export const subRedis = createClient("bun-sub-redis", false);

// 3. Blocking Publisher / Stream Worker (XREADGROUP, XADD, etc)
// enableReadyCheck: false — required for BullMQ & stream blocking commands
export const bpubRedis = createClient("bun-bpub-redis", false);

// Compatibility Alias (keeps existing code working)
export const redis = appRedis;
