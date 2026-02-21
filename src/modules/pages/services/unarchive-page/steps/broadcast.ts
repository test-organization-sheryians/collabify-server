/**
 * Step 4 — Broadcast
 *
 * Publishes a page:unarchived event via Redis Pub/Sub.
 * Connected clients restore the page to the active tree.
 *
 * Best-effort: a publish failure after the DB update is logged but not re-thrown.
 */

import { PageKeys } from "../../../infra/page-keys";
import type { Redis } from "ioredis";

export async function broadcast(
  pageId: string,
  unarchivedBy: string,
  redis: Redis
): Promise<void> {
  await redis.publish(
    PageKeys.PageEvents(pageId),
    JSON.stringify({
      type: "page:unarchived",
      data: { pageId, unarchivedBy },
    })
  );
}
