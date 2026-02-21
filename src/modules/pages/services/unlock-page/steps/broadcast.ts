/**
 * Step 4 — Broadcast
 *
 * Publishes a page:unlocked event via Redis Pub/Sub.
 * Connected clients re-enable their editors on receiving this event.
 *
 * Best-effort: a publish failure after Redis DEL + DB update is logged
 * but not re-thrown. The lock is already released.
 */

import { PageKeys } from "../../../infra/page-keys";
import type { Redis } from "ioredis";

export async function broadcast(
  pageId: string,
  unlockedBy: string,
  redis: Redis
): Promise<void> {
  await redis.publish(
    PageKeys.PageEvents(pageId),
    JSON.stringify({
      type: "page:unlocked",
      data: { pageId, unlockedBy },
    })
  );
}
