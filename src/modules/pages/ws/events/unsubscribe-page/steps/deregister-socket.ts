/**
 * Step 2 — Deregister Socket
 *
 * Removes this socket from both page pub/sub channels in wsRegistry.
 * Must happen after cleanup-presence so in-flight broadcasts during cleanup
 * still reach this socket.
 *
 * Best-effort — socket may already be partially closed.
 */

import { wsRegistry } from "@/infra/ws/subscription-registry";
import { createLogger } from "@/shared/lib/logger";
import { PageKeys } from "../../../../infra/page-keys";

const logger = createLogger("pages:ws:unsubscribe-page:deregister-socket");

export async function deregisterSocket(
  socketId: string,
  pageId: string
): Promise<void> {
  try {
    await wsRegistry.unsubscribe(socketId, PageKeys.PageEvents(pageId));
    await wsRegistry.unsubscribe(socketId, PageKeys.PageAwareness(pageId));
  } catch (err) {
    logger.error("wsRegistry unsubscribe failed", { pageId, socketId, err });
  }
}
