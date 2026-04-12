import { db } from "@/infra/db";
import { redis } from "@/infra/redis";
import { z } from "zod";
import { REDIS_KEYS, TTL } from "../../constants";
import * as countCache from "../../channels/in-app/inapp.count-cache";
import { createLogger } from "@/shared/lib/logger";

// =============================================================================
// Get Unread Notification Count
// Redis-first: read from count cache, fallback to Postgres COUNT(*).
// =============================================================================

const logger = createLogger("notification:management:queries:get-unread-count");

export const GetUnreadCountSchema = z.object({ userId: z.string() });
export type GetUnreadCountInput = z.infer<typeof GetUnreadCountSchema>;

export async function getUnreadCount(input: GetUnreadCountInput): Promise<number> {
  const { userId } = input;

  // ── Redis-first (sub-ms) ──────────────────────────────────────────────
  const cached = await countCache.get(userId);
  if (cached !== null) {
    logger.debug("get-unread-count: cache hit", { userId, count: cached });
    return cached;
  }

  // ── DB fallback + warm the cache ─────────────────────────────────────
  const count = await db.notification.count({
    where: {
      recipientUserId: userId,
      isRead:          false,
      isArchived:      false,
    },
  });

  // Write-through: warm the count cache for next request
  try {
    await redis.set(
      `${REDIS_KEYS.UNREAD_COUNT_PREFIX}${userId}`,
      String(count),
      "EX",
      TTL.PREF_GLOBAL
    );
  } catch {
    /* non-fatal — next request falls back to DB again */
  }

  logger.debug("get-unread-count: DB fallback", { userId, count });
  return count;
}
