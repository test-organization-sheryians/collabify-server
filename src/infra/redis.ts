import Redis from "ioredis";
import { logger } from "../shared/logger";
import { env } from "../shared/config/env";

const REDIS_URL = env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  connectionName: "bun-server-redis",
});

redis.on("error", (err) => {
  logger.error({ err }, "Redis connection error");
});

redis.on("connect", () => {
  logger.info("Redis connected");
});

// -- LUA SCRIPTS --

// KEYS[1]=key
// ARGV[1]=owner, ARGV[2]=hash, ARGV[3]=ttl
const ACQUIRE_SCRIPT = `
if redis.call("EXISTS", KEYS[1]) == 1 then
  local raw = redis.call("GET", KEYS[1])
  if not raw then return "GONE" end
  local data = cjson.decode(raw)
  if data.hash ~= ARGV[2] then return "CONFLICT" end
  if data.status == "COMPLETED" then return "COMPLETED" end
  return "LOCKED"
end
redis.call("SET", KEYS[1], cjson.encode({status="PROCESSING", owner=ARGV[1], hash=ARGV[2]}), "EX", ARGV[3])
return "ACQUIRED"
`;

// KEYS[1]=key
// ARGV[1]=owner, ARGV[2]=ttl
const COMPLETE_SCRIPT = `
local raw = redis.call("GET", KEYS[1])
if not raw then return "STOLEN" end
local data = cjson.decode(raw)
if data.owner == ARGV[1] then
  data.status = "COMPLETED"
  redis.call("SET", KEYS[1], cjson.encode(data), "EX", ARGV[2])
  return "OK"
end
return "STOLEN"
`;

// KEYS[1]=key
// ARGV[1]=owner
const RELEASE_SCRIPT = `
local raw = redis.call("GET", KEYS[1])
if not raw then return "GONE" end
local data = cjson.decode(raw)
if data.owner == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return "STOLEN"
`;

export const IdempotencyStore = {
  acquire: async (
    key: string,
    owner: string,
    hash: string,
    ttlSeconds = 30
  ): Promise<"ACQUIRED" | "LOCKED" | "CONFLICT" | "COMPLETED" | "GONE"> => {
    const result = await redis.eval(
      ACQUIRE_SCRIPT,
      1,
      key,
      owner,
      hash,
      ttlSeconds.toString()
    );
    return result as "ACQUIRED" | "LOCKED" | "CONFLICT" | "COMPLETED" | "GONE";
  },

  complete: async (
    key: string,
    owner: string,
    ttlSeconds = 300
  ): Promise<"OK" | "STOLEN"> => {
    const result = await redis.eval(
      COMPLETE_SCRIPT,
      1,
      key,
      owner,
      ttlSeconds.toString()
    );
    return result as "OK" | "STOLEN";
  },

  release: async (
    key: string,
    owner: string
  ): Promise<"OK" | "STOLEN" | "GONE"> => {
    const result = await redis.eval(RELEASE_SCRIPT, 1, key, owner);
    return result as "OK" | "STOLEN" | "GONE";
  },
};
