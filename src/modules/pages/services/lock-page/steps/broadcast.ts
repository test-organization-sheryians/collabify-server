/**
 * Step 4 — Broadcast
 *
 * Publishes a page:locked event via Redis Pub/Sub.
 * Connected clients show the lock badge and disable their editor.
 *
 * Best-effort: a publish failure after Redis lock + DB update is logged
 * but not re-thrown. The lock is already active.
 */

import { PageKeys } from "../../../infra/page-keys";
import type { Redis } from "ioredis";

export async function broadcast(
  pageId: string,
  lockedBy: string,
  redis: Redis
): Promise<void> {
  await redis.publish(
    PageKeys.PageEvents(pageId),
    JSON.stringify({
      type: "page:locked",
      data: { pageId, lockedBy },
    })
  );
}
