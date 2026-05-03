import { redis } from "@/infra/redis";
import { REDIS_KEYS } from "../../constants";
import { createLogger } from "@/shared/lib/logger";

// =============================================================================
// Presence Checker
//
// Determines if a user is currently online (active WebSocket connection).
// Used by the Decider to route between REALTIME (online) and PUSH/EMAIL (offline).
//
// Presence keys are written by the WS Gateway on connect/disconnect:
//   SET notif:presence:{userId} "1" EX {session_ttl}
//   DEL notif:presence:{userId}
//
// This module is read-only — it never writes presence state.
// =============================================================================

const logger = createLogger("notification:shared:presence");

/**
 * Returns true if the user has an active WebSocket session.
 * Falls back to false (treat as offline) on Redis failure — safe default
 * because offline path (PUSH + EMAIL) is more complete than REALTIME-only.
 */
export async function isOnline(userId: string): Promise<boolean> {
  try {
    const key = `${REDIS_KEYS.PRESENCE_PREFIX}${userId}`;
    const value = await redis.get(key);
    return value !== null;
  } catch (err) {
    logger.warn("Presence check failed — treating user as offline", {
      err,
      userId,
    });
    return false;
  }
}
