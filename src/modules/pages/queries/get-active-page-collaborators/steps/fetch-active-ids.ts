/**
 * Step 2 — Fetch Active IDs
 *
 * ZRANGE page:{pageId}:subscribers 0 -1 → all currently subscribed userIds.
 * The ZSET is managed by subscribe-page (ZADD) and unsubscribe-page (ZREM).
 * TTL = 24h — stale sessions from crashed clients auto-expire.
 *
 * Returns an empty array when no one is actively subscribed.
 */

import { PageKeys } from "../../../infra/page-keys";
import type { Redis } from "ioredis";

export async function fetchActiveIds(
  pageId: string,
  redis: Redis
): Promise<string[]> {
  return redis.zrange(PageKeys.PageSubscribers(pageId), 0, -1);
}
