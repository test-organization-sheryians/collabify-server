/**
 * Step 4 — Broadcast
 *
 * Publishes a page:deleted event to connected subscribers via Redis Pub/Sub.
 * Connected clients should redirect to the project root on receiving this event.
 *
 * Best-effort: a publish failure after the DB soft-delete is logged but not
 * re-thrown. The deletion is already persisted regardless.
 */

import { PageKeys } from "../../../infra/page-keys";
import type { Redis } from "ioredis";

export async function broadcast(
  pageId: string,
  deletedBy: string,
  redis: Redis
): Promise<void> {
  await redis.publish(
    PageKeys.PageEvents(pageId),
    JSON.stringify({
      type: "page:deleted",
      data: { pageId, deletedBy },
    })
  );
}
