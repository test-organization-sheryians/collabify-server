import { WSHandlerContext, ChatWebSocket } from "@/infra/ws/types";
import { createLogger } from "@/shared/lib/logger";
import { appRedis } from "@/infra/redis";
import { PageKeys } from "../../../infra/page-keys";
import type { AwarenessUpdateInput } from "./schema";

const logger = createLogger("pages:ws:awareness-update");

/**
 * awarenessUpdate WS handler — ephemeral HOT PATH (<5ms target)
 *
 * y-protocols/awareness updates carry cursor + selection state.
 * NOT written to stream — ephemeral, no persistence.
 * One PUBLISH call, no ACK.
 *
 * Workflow:
 * 1. Silent auth check (fire-and-forget — no error frame)
 * 2. PUBLISH to PageAwareness pub/sub channel with originSocketId
 */
export const awarenessUpdateHandler = async (
  ctx: WSHandlerContext,
  socket: ChatWebSocket,
  input: AwarenessUpdateInput
) => {
  const { userId, socketId } = socket.data;
  const { pageId, update } = input;

  // Step 1 — Silent auth: userId is guaranteed by WS upgrade flow
  // Awareness is fire-and-forget — never error-frame for invalid input
  if (!update || typeof update !== "string") return;

  // Step 2 — PUBLISH to awareness channel (NOT PageEvents — separate channel)
  // TODO: await appRedis.publish(
  //   PageKeys.PageAwareness(pageId),
  //   JSON.stringify({ update, userId, originSocketId: socketId })
  // )

  logger.debug("awareness-update: not yet implemented", { pageId, userId });
};
