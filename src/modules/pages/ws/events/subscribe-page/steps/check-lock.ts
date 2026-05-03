/**
 * Step 2 — Check Lock
 *
 * Reads the current page lock owner from Redis.
 * Informational only — lock is included in subscribe-success so the client
 * can render the lock badge immediately on open.
 * Authoritative enforcement is in page-update handler.
 */

import { PageKeys } from "../../../../infra/page-keys";
import type { Redis } from "ioredis";

export async function checkLock(
  pageId: string,
  redis: Redis
): Promise<boolean> {
  const lockOwner = await redis.get(PageKeys.PageLock(pageId));
  return Boolean(lockOwner);
}
