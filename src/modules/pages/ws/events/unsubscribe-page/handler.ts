import { WSHandlerContext, ChatWebSocket } from "@/infra/ws/types";
import { createLogger } from "@/shared/lib/logger";
import type { UnsubscribePageInput } from "./schema";

import { cleanupPresence } from "./steps/cleanup-presence";
import { deregisterSocket } from "./steps/deregister-socket";
import { bumpEpoch } from "./steps/bump-epoch";
import { cleanUserState } from "./steps/clean-user-state";
import { broadcastLeft } from "./steps/broadcast-left";

const logger = createLogger("pages:ws:unsubscribe-page");

/**
 * unsubscribePage — WS Event Handler
 *
 * Called on explicit leave OR implicit socket disconnect cleanup.
 * All operations after cleanup-presence are best-effort — socket may be closing.
 *
 * Execution order:
 *   1. cleanupPresence   — Lua ZREM + conditional page deactivation (1 RTT)
 *   2. deregisterSocket  — wsRegistry.unsubscribe both channels
 *   3. bumpEpoch         — INCR sys:pages:epoch (only if page deactivated)
 *   4. cleanUserState    — DEL ephemeral user state key
 *   5. broadcastLeft     — PUBLISH user-left + ACK socket
 *
 * See README.md for full system design.
 */
export const unsubscribePageHandler = async (
  ctx: WSHandlerContext,
  socket: ChatWebSocket,
  input: UnsubscribePageInput
) => {
  const { userId, socketId } = socket.data;
  const { pageId } = input;

  logger.info("Unsubscribe request", { pageId, userId });

  // 1. Atomic presence cleanup (Lua: ZREM + conditional page deactivation)
  const pageDeactivated = await cleanupPresence(pageId, userId, ctx.redis);

  // 2. Deregister socket from both pub/sub channels
  await deregisterSocket(socketId, pageId);

  // 3. Bump epoch if this was the last subscriber (signals stream workers)
  if (pageDeactivated === 1) {
    await bumpEpoch(pageId, ctx.redis);
  }

  // 4. Clean ephemeral user state
  await cleanUserState(pageId, userId, ctx.redis);

  // 5. Broadcast user-left + ACK (best-effort — socket may be closing)
  await broadcastLeft(pageId, userId, socket, ctx.redis);

  logger.info("User unsubscribed", {
    pageId,
    userId,
    pageDeactivated: pageDeactivated === 1,
  });
};
