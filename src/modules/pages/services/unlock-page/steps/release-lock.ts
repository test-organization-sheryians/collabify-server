/**
 * Step 2 — Release Lock
 *
 * Deletes the Redis lock key, releasing the exclusive editor lock.
 * DEL is idempotent — safe to call even if the key already expired (TTL).
 */

import { PageKeys } from "../../../infra/page-keys";
import type { Redis } from "ioredis";

export async function releaseLock(pageId: string, redis: Redis): Promise<void> {
  await redis.del(PageKeys.PageLock(pageId));
}
