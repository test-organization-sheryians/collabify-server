import {
  WSHandlerContext,
  ChatWebSocket,
  createSuccessFrame,
} from "@/infra/ws/types";
import { createLogger } from "@/shared/lib/logger";
import { appRedis } from "@/infra/redis";
import { wsRegistry } from "@/infra/ws/subscription-registry";
import { PageKeys } from "../../../infra/page-keys";
import { UNSUBSCRIBE_CLEANUP_SCRIPT } from "../../../infra/lua/cleanup";
import type { UnsubscribePageInput } from "./schema";

const logger = createLogger("pages:ws:unsubscribe-page");

/**
 * unsubscribePage — WS event handler
 *
 * Called on explicit leave OR implicit socket disconnect cleanup.
 * All operations are best-effort after the Lua cleanup — socket may already be closing.
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

  // ─── Step 1: Atomic presence cleanup (Lua, 1 RTT) ────────────────────────────
  // ZREM subscribers + ZCARD + conditional ZREM sys:pages:active
  // Returns 1 if page was deactivated (last subscriber left), 0 otherwise.

  let pageDeactivated = 0;
  try {
    pageDeactivated = (await appRedis.eval(
      UNSUBSCRIBE_CLEANUP_SCRIPT,
      2,
      PageKeys.PageSubscribers(pageId),
      PageKeys.SysActivePages(),
      userId,
      pageId
    )) as number;
  } catch (err) {
    logger.error("Lua cleanup failed", { pageId, userId, err });
    // Continue — best-effort cleanup for remaining steps
  }

  // ─── Step 2: Unsubscribe socket from both channels ───────────────────────────

  try {
    await wsRegistry.unsubscribe(socketId, PageKeys.PageEvents(pageId));
    await wsRegistry.unsubscribe(socketId, PageKeys.PageAwareness(pageId));
  } catch (err) {
    logger.error("wsRegistry unsubscribe failed", { pageId, socketId, err });
  }

  // ─── Step 3: Bump epoch if page deactivated ───────────────────────────────────
  // Signals stream worker instances to re-partition and stop consuming this page.

  if (pageDeactivated === 1) {
    try {
      await appRedis.incr(PageKeys.SysPagesEpoch());
      logger.info("Page deactivated — epoch bumped", { pageId });
    } catch (err) {
      logger.error("Failed to bump epoch", { pageId, err });
    }
  }

  // ─── Step 4: Clean ephemeral user state ──────────────────────────────────────

  try {
    await appRedis.del(PageKeys.PageUserState(pageId, userId));
  } catch (err) {
    logger.error("Failed to clean user state", { pageId, userId, err });
  }

  // ─── Step 5: Broadcast user-left ─────────────────────────────────────────────

  try {
    await appRedis.publish(
      PageKeys.PageEvents(pageId),
      createSuccessFrame(undefined, "page:user-left", {
        pageId,
        userId,
        timestamp: Date.now(),
      })
    );
  } catch (err) {
    logger.error("Failed to broadcast user-left", { pageId, userId, err });
  }

  // ─── Step 6: ACK (best-effort — socket may already be closing) ───────────────

  try {
    socket.send(
      createSuccessFrame(undefined, "page:unsubscribe-success", { pageId })
    );
  } catch {
    // Swallow silently — socket may be in CLOSING state
  }

  logger.info("User unsubscribed", {
    pageId,
    userId,
    pageDeactivated: pageDeactivated === 1,
  });
};
