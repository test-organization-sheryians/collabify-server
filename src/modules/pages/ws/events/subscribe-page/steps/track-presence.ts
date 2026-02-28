/**
 * Step 3 — Track Presence
 *
 * Two Lua operations:
 *   a) PRESENCE_TRACKING_SCRIPT — ZADD user to subscribers sorted set.
 *      Returns [isNew: 0|1, subscriberCount: number].
 *      isNew=1 → first time this user joined (not a reconnect/second tab).
 *
 *   b) PAGE_ACTIVATION_SCRIPT — if subscriberCount === 1 (first subscriber),
 *      ZADD pageId to sys:pages:active so the stream worker picks it up.
 *
 * WHY COMBINED: Both Lua calls are always executed in sequence with no
 * branching between a and b itself (just a conditional for activation).
 */

import { createLogger } from "@/shared/lib/logger";
import { PageKeys, PageTTLs } from "../../../../infra/page-keys";
import {
  PRESENCE_TRACKING_SCRIPT,
  PAGE_ACTIVATION_SCRIPT,
} from "../../../../infra/lua/presence";
import type { Redis } from "ioredis";

const logger = createLogger("pages:ws:subscribe-page:track-presence");

export interface PresenceResult {
  isNew: number; // 1 = first join, 0 = reconnect / second tab
  subscriberCount: number;
}

export async function trackPresence(
  pageId: string,
  userId: string,
  timestamp: number,
  redis: Redis
): Promise<PresenceResult> {
  const [isNew, subscriberCount] = (await redis.eval(
    PRESENCE_TRACKING_SCRIPT,
    1,
    PageKeys.PageSubscribers(pageId),
    userId,
    timestamp.toString(),
    PageTTLs.SUBSCRIBERS.toString()
  )) as [number, number];

  logger.info("Presence updated", {
    pageId,
    userId,
    subscriberCount,
    isNew: isNew === 1,
  });

  if (subscriberCount === 1) {
    await redis.eval(
      PAGE_ACTIVATION_SCRIPT,
      2,
      PageKeys.SysActivePages(),
      PageKeys.SysPagesEpoch(),
      pageId,
      timestamp.toString()
    );
    logger.info("Page activated", { pageId });
  }

  return { isNew, subscriberCount };
}
