/**
 * Step 4 — Broadcast
 *
 * Publishes a page:reordered event via Redis Pub/Sub so all connected clients
 * can update their page tree without a full refetch.
 *
 * Best-effort: a publish failure after the DB update is logged but not re-thrown.
 */

import { PageKeys } from "../../../infra/page-keys";
import type { Redis } from "ioredis";

export async function broadcast(
  pageId: string,
  newParentId: string | null | undefined,
  newPosition: number,
  reorderedBy: string,
  redis: Redis
): Promise<void> {
  await redis.publish(
    PageKeys.PageEvents(pageId),
    JSON.stringify({
      type: "page:reordered",
      data: {
        pageId,
        newParentId: newParentId ?? null,
        newPosition,
        reorderedBy,
      },
    })
  );
}
