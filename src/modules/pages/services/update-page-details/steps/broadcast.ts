/**
 * Step 3 — Broadcast
 *
 * Publishes a page:details-updated event via Redis Pub/Sub.
 * Carries only the changed fields so subscribers can apply minimal diffs.
 * Best-effort: failure is logged but not re-thrown.
 */

import { PageKeys } from "../../../infra/page-keys";
import type { Redis } from "ioredis";

export async function broadcast(
  pageId: string,
  updatedBy: string,
  fields: { emoji?: string | null; coverImageUrl?: string | null },
  redis: Redis
): Promise<void> {
  await redis.publish(
    PageKeys.PageEvents(pageId),
    JSON.stringify({
      type: "page:details-updated",
      data: { pageId, updatedBy, ...fields },
    })
  );
}
