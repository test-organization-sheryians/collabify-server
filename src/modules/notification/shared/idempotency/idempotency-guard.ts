import { redis } from "@/infra/redis";
import { REDIS_KEYS, TTL } from "../../constants";
import { createLogger } from "@/shared/lib/logger";

// =============================================================================
// Idempotency Guard
//
// Prevents double-processing of the same event across restarts, retries,
// and duplicate outbox rows. Uses Redis SET NX EX for atomic check-and-set.
//
// Key structure: `notif:idem:{scope}:{eventId}:{suffix?}`
//
// Each channel uses its own scope so a single event can be processed
// independently per channel without one blocking another.
// =============================================================================

export type IdempotencyScope =
  | "decider"
  | "fanout"
  | "email"
  | "inapp"
  | "push"
  | "realtime"
  | "batch";

const logger = createLogger("notification:shared:idempotency");

/**
 * Check if this event+scope combination has already been processed.
 *
 * @returns true  → first time seen, acquired the lock, safe to proceed.
 * @returns false → duplicate, skip processing.
 */
export async function check(
  eventId: string,
  scope: IdempotencyScope,
  /** Optional suffix for fan-out (e.g., recipientUserId) to unique-ify per recipient. */
  suffix?: string
): Promise<boolean> {
  const key = buildKey(eventId, scope, suffix);

  try {
    const acquired = await redis.set(key, "1", "EX", TTL.IDEMPOTENCY, "NX");

    if (!acquired) {
      logger.debug("Idempotency guard: duplicate event dropped", {
        eventId,
        scope,
        suffix,
      });
      return false;
    }
    return true;
  } catch (err) {
    // Redis failure → allow processing to continue (prefer duplicate over dropped)
    // The dedup guard at the channel layer is a secondary safety net.
    logger.warn("Idempotency guard: Redis error, allowing processing", {
      err,
      eventId,
      scope,
    });
    return true;
  }
}

function buildKey(
  eventId: string,
  scope: IdempotencyScope,
  suffix?: string
): string {
  const base = `${REDIS_KEYS.IDEMPOTENCY_PREFIX}${scope}:${eventId}`;
  return suffix ? `${base}:${suffix}` : base;
}
