import { redis } from "@/infra/redis";
import { REDIS_KEYS, TTL } from "../../constants";
import { createLogger } from "@/shared/lib/logger";
import type { RateLimitConfig } from "../../events/types";

// =============================================================================
// Rate Limiter
//
// Sliding-window rate limit using Redis INCR + EXPIRE.
// Config-driven — each EventDefinition supplies its own RateLimitConfig.
// Supports two scopes:
//   - per_user:            key = `notif:rate:{userId}:{eventType}`
//   - per_user_per_entity: key = `notif:rate:{userId}:{eventType}:{entityValue}`
// =============================================================================

const logger = createLogger("notification:shared:rate-limit");

/**
 * Check if the user has exceeded the rate limit for this event type.
 *
 * @returns true  → within limit, safe to proceed.
 * @returns false → limit exceeded, drop this notification.
 */
// Sliding-window Lua script.
// Uses a sorted set where each member is a unique token (timestamp:randomSuffix)
// and the score is the Unix timestamp in ms.
// On each call:
//   1. Remove members older than windowMs
//   2. Count remaining members
//   3. If count < max → add new member, set key expiry, return 1 (allowed)
//      Else → return 0 (rate limited)
const SLIDING_WINDOW_SCRIPT = `
local key      = KEYS[1]
local now      = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local max      = tonumber(ARGV[3])
local token    = ARGV[4]

redis.call('ZREMRANGEBYSCORE', key, '-inf', now - windowMs)
local count = redis.call('ZCARD', key)
if count < max then
  redis.call('ZADD', key, now, token)
  redis.call('PEXPIRE', key, windowMs)
  return 1
end
return 0
`;

export async function check(
  userId: string,
  eventType: string,
  config: RateLimitConfig,
  /** Raw payload — used to extract entityKey value for per_user_per_entity scope. */
  payload?: Record<string, unknown>
): Promise<boolean> {
  const key       = buildKey(userId, eventType, config, payload);
  const windowMs  = config.window;
  const now       = Date.now();
  // Unique token prevents collisions when two requests arrive in the same ms
  const token     = `${now}:${Math.random().toString(36).slice(2, 8)}`;

  try {
    const result = await redis.eval(
      SLIDING_WINDOW_SCRIPT,
      1,
      key,
      String(now),
      String(windowMs),
      String(config.max),
      token
    ) as number;

    if (result === 0) {
      logger.warn("Rate limit exceeded — notification dropped", {
        userId,
        eventType,
        max: config.max,
        windowMs,
      });
      return false;
    }
    return true;
  } catch (err) {
    // Redis failure → allow (prefer delivery over silently dropping)
    logger.warn("Rate limiter: Redis error, allowing delivery", {
      err,
      userId,
      eventType,
    });
    return true;
  }
}

function buildKey(
  userId: string,
  eventType: string,
  config: RateLimitConfig,
  payload?: Record<string, unknown>
): string {
  const base = `${REDIS_KEYS.RATE_LIMIT_PREFIX}${userId}:${eventType}`;

  if (config.scope === "per_user_per_entity" && config.entityKey && payload) {
    const entityValue = payload[config.entityKey];
    if (entityValue) {
      return `${base}:${String(entityValue)}`;
    }
  }
  return base;
}

/**
 * Returns the default rate limit config used when an EventDefinition
 * doesn't specify one but rate limiting is still desired for safety.
 */
export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  scope:  "per_user",
  window: TTL.RATE_LIMIT_DEFAULT * 1000,
  max:    20,
};
