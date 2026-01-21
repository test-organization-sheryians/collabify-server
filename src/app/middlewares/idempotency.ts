import { Context, Next } from "hono";
import { redis } from "../../infra/redis";
import { AppError } from "../../shared/errors";
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
      String(ttlSeconds)
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
      String(ttlSeconds)
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

// -- MIDDLEWARE --

export const idempotencyMiddleware = async (c: Context, next: Next) => {
  const method = c.req.method;

  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return next();
  }

  const idempotencyKey = c.req.header("x-idempotency-key");
  if (!idempotencyKey) {
    return next();
  }

  const auth = c.get("auth");
  const userId = auth?.userId;
  const owner = userId || "u_anon";

  const redisKey = `idempotency:${owner}:${idempotencyKey}`;
  const CONSTANT_HASH = "HEADER_ONLY_MODE";

  const result = await IdempotencyStore.acquire(redisKey, owner, CONSTANT_HASH);

  if (result === "LOCKED") {
    throw new AppError(
      "Request is currently processing",
      "IDEMPOTENCY_LOCKED",
      429
    );
  }

  if (result === "CONFLICT") {
    throw new AppError("Idempotency key conflict", "IDEMPOTENCY_CONFLICT", 409);
  }

  try {
    await next();
    await IdempotencyStore.complete(redisKey, owner);
  } catch (err) {
    const isSafeError = err instanceof AppError && err.httpStatus < 500;

    if (isSafeError) {
      await IdempotencyStore.release(redisKey, owner);
    }

    throw err;
  }
};
