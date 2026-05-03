import { redis } from "@/infra/redis";
import { REDIS_KEYS } from "../../constants";
import { createLogger } from "@/shared/lib/logger";

// =============================================================================
// In-App Unread Count Cache
//
// Maintains `notif:unread:{userId}` Redis counter as the single source of
// truth for the unread notification badge. Never query COUNT(*) from Postgres.
//
// Written by InAppWorker on insert. Decremented by mark-read service.
// Read by get-unread-count query handler.
// =============================================================================

const logger = createLogger("notification:channel:inapp:count-cache");

function key(userId: string): string {
  return `${REDIS_KEYS.UNREAD_COUNT_PREFIX}${userId}`;
}

/**
 * Increment the unread count by 1 when a new IN_APP notification is written.
 * Returns the new count.
 */
export async function increment(userId: string): Promise<number> {
  try {
    return await redis.incr(key(userId));
  } catch (err) {
    logger.warn("Unread count cache: increment failed", { err, userId });
    return 0;
  }
}

/**
 * Decrement the unread count by `by` when notifications are marked as read.
 * Clamped at 0 — never goes negative.
 */
// Lua script: atomically decrement by `by`, clamp to 0.
// Executes as a single Redis command — no race condition.
const DECR_CLAMP_SCRIPT = `
local current = redis.call('GET', KEYS[1])
if current == false then return 0 end
local next = math.max(0, tonumber(current) - tonumber(ARGV[1]))
redis.call('SET', KEYS[1], tostring(next))
return next
`;

export async function decrement(userId: string, by = 1): Promise<void> {
  try {
    await redis.eval(DECR_CLAMP_SCRIPT, 1, key(userId), String(by));
  } catch (err) {
    logger.warn("Unread count cache: decrement failed", { err, userId });
  }
}

/**
 * Get the current unread count. Returns null on cache miss (caller falls through to DB).
 */
export async function get(userId: string): Promise<number | null> {
  try {
    const val = await redis.get(key(userId));
    return val === null ? null : parseInt(val, 10);
  } catch (err) {
    logger.warn("Unread count cache: get failed", { err, userId });
    return null;
  }
}

/**
 * Reset the counter to 0 (used by mark-all-read service).
 */
export async function reset(userId: string): Promise<void> {
  try {
    await redis.set(key(userId), "0");
  } catch (err) {
    logger.warn("Unread count cache: reset failed", { err, userId });
  }
}
