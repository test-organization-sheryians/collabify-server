/**
 * Step 3 — Broadcast
 *
 * Publishes a page:renamed event via Redis Pub/Sub so connected clients
 * can update the page title in their sidebar without a full refetch.
 *
 * Best-effort: publish failure after the DB update is logged but not re-thrown.
 */

import { PageKeys } from "../../../infra/page-keys";
import type { Redis } from "ioredis";

export async function broadcast(
  pageId: string,
  title: string,
  renamedBy: string,
  redis: Redis
): Promise<void> {
  await redis.publish(
    PageKeys.PageEvents(pageId),
    JSON.stringify({
      type: "page:renamed",
      data: { pageId, title, renamedBy },
    })
  );
}
