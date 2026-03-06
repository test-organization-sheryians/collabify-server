/**
 * Step 3 — Broadcast
 *
 * Publishes a page:archived event to connected subscribers via Redis Pub/Sub.
 * Connected clients remove the page from the active tree and may show it in
 * an archive section.
 *
 * This step is best-effort — a publish failure after the DB update is logged
 * but not re-thrown. The archive is already persisted.
 */

import { PageKeys } from "../../../infra/page-keys";
import type { Redis } from "ioredis";

export async function broadcast(
  pageId: string,
  archivedBy: string,
  redis: Redis
): Promise<void> {
  await redis.publish(
    PageKeys.PageEvents(pageId),
    JSON.stringify({
      type: "page:archived",
      data: { pageId, archivedBy },
    })
  );
}
