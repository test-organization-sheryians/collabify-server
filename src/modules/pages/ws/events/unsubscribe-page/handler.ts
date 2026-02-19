import {
  WSHandlerContext,
  ChatWebSocket,
  createSuccessFrame,
  createErrorFrame,
} from "@/infra/ws/types";
import { createLogger } from "@/shared/lib/logger";
import { appRedis } from "@/infra/redis";
import { wsRegistry } from "@/infra/ws/subscription-registry";
import { PageKeys } from "../../../infra/page-keys";
import type { UnsubscribePageInput } from "./schema";

const logger = createLogger("pages:ws:unsubscribe-page");

/**
 * unsubscribePage WS handler
 *
 * Called on explicit unsubscribe OR socket disconnect cleanup.
 *
 * Workflow:
 * 1. ZREM from PageSubscribers ZSET
 * 2. Unregister socket from wsRegistry
 * 3. If last subscriber (ZCARD = 0): ZREM from sys:pages:active + INCR epoch
 * 4. Broadcast user-left
 * 5. ACK (best-effort — socket may already be closing)
 */
export const unsubscribePageHandler = async (
  ctx: WSHandlerContext,
  socket: ChatWebSocket,
  input: UnsubscribePageInput
) => {
  const { userId, socketId } = socket.data;
  const { pageId } = input;

  // Step 1 — Remove from presence ZSET (atomic)
  const cleanupScript = `
    local subKey = KEYS[1]; local activeKey = KEYS[2]
    local userId = ARGV[1]; local pageId = ARGV[2]
    redis.call('ZREM', subKey, userId)
    local remaining = redis.call('ZCARD', subKey)
    if remaining == 0 then
      redis.call('ZREM', activeKey, pageId)
      return 1
    end
    return 0
  `;
  // TODO: const pageDeactivated = await appRedis.eval(cleanupScript, 2, PageKeys.PageSubscribers(pageId), PageKeys.SysActivePages(), userId, pageId) as number

  // Step 2 — Unregister socket
  // TODO: await wsRegistry.unsubscribe(socketId, PageKeys.PageEvents(pageId))

  // Step 3 — Bump epoch if page deactivated
  // TODO: if (pageDeactivated === 1) await appRedis.incr(PageKeys.SysPagesEpoch())

  // Step 4 — Broadcast user-left
  // TODO: await appRedis.publish(PageKeys.PageEvents(pageId), createSuccessFrame(undefined, "page:user-left", { pageId, userId, timestamp: Date.now() }))

  // Step 5 — ACK (try/catch — socket may be closing)
  // TODO: try { socket.send(createSuccessFrame(undefined, "page:unsubscribe-success", { pageId })) } catch {}

  logger.info("unsubscribe-page: not yet implemented", { pageId, userId });
};
