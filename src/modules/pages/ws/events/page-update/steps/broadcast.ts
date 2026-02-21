/**
 * Step 5+6 — Broadcast
 *
 * Two sequential operations after a successful stream append:
 *   5. ACK the sender — durability guarantee (update IS in the stream)
 *   6. Pub/Sub broadcast — notify all other subscribers on all gateway nodes
 *
 * WHY COMBINED: ACK must happen before PUBLISH (ordering contract with client).
 * Both require the same `streamId` from appendToStream. Separating them would
 * create two tiny files sharing the same input with no independent testability.
 *
 * ACK is sent synchronously (socket.send is direct in-process).
 * PUBLISH is async but we await it — failure is logged, not re-thrown
 * (best-effort delivery; gap-fill at next subscribe recovers missed entries).
 *
 * originSocketId in the pub/sub envelope: wsRegistry skips the sender's
 * socket during dispatch so the sender doesn't echo its own update.
 * Multi-device users on the same account DO receive the broadcast (different socketIds).
 */

import { createSuccessFrame } from "@/infra/ws/types";
import { createLogger } from "@/shared/lib/logger";
import { PageKeys } from "../../../../infra/page-keys";
import type { ChatWebSocket } from "@/infra/ws/types";
import type { Redis } from "ioredis";

const logger = createLogger("pages:ws:page-update:broadcast");

export interface BroadcastParams {
  pageId: string;
  userId: string;
  dedupeId: string;
  socketId: string;
  streamId: string;
  update: string; // original base64 — not re-encoded
}

export async function broadcast(
  socket: ChatWebSocket,
  redis: Redis,
  params: BroadcastParams
): Promise<void> {
  const { pageId, userId, dedupeId, socketId, streamId, update } = params;
  const timestamp = Date.now();

  // Step 5 — ACK sender (durability guarantee before broadcast)
  socket.send(
    createSuccessFrame(dedupeId, "page:update-ack", {
      dedupeId,
      status: "sent",
      streamId,
      pageId,
    })
  );

  // Step 6 — Pub/Sub broadcast to all other subscribers
  // originSocketId: wsRegistry dispatcher skips the sender's socket (self-echo prevention)
  const frame = createSuccessFrame(undefined, "page:page-update", {
    pageId,
    streamId,
    update,
    userId,
    timestamp,
  });

  try {
    await redis.publish(
      PageKeys.PageEvents(pageId),
      JSON.stringify({ message: frame, originSocketId: socketId })
    );

    logger.debug("Broadcast published", { pageId, streamId });
  } catch (err) {
    // PUBLISH failure is non-fatal — gap-fill at next subscribe recovers missed entries
    logger.error("PUBLISH failed — subscribers may miss this update", {
      err,
      pageId,
      streamId,
    });
  }
}

/**
 * Sends a duplicate-ACK to the sender when the update was already in the stream.
 * No broadcast — it was already broadcast on the first write.
 */
export function ackDuplicate(
  socket: ChatWebSocket,
  dedupeId: string,
  pageId: string
): void {
  socket.send(
    createSuccessFrame(dedupeId, "page:update-ack", {
      dedupeId,
      status: "duplicate",
      streamId: "",
      pageId,
    })
  );
}
