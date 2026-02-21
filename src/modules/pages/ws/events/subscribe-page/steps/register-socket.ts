/**
 * Step 4 — Register Socket
 *
 * Subscribes this socket to BOTH page pub/sub channels:
 *   - page:{id}:events    — Yjs CRDT updates (page:page-update broadcasts)
 *   - page:{id}:awareness — cursor/selection state (page:awareness-update broadcasts)
 *
 * WHY TWO CHANNELS: Pages separates content from awareness to avoid mixing
 * durable CRDT updates with ephemeral cursor state. Whiteboard only uses one.
 */

import { wsRegistry } from "@/infra/ws/subscription-registry";
import { PageKeys } from "../../../../infra/page-keys";

export async function registerSocket(
  socketId: string,
  pageId: string
): Promise<void> {
  await wsRegistry.subscribe(socketId, PageKeys.PageEvents(pageId));
  await wsRegistry.subscribe(socketId, PageKeys.PageAwareness(pageId));
}
