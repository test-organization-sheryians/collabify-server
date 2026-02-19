import {
  WSHandlerContext,
  ChatWebSocket,
  createSuccessFrame,
  createErrorFrame,
} from "@/infra/ws/types";
import { createLogger } from "@/shared/lib/logger";
import { appRedis } from "@/infra/redis";
import { wsRegistry } from "@/infra/ws/subscription-registry";
import { PageKeys, PageTTLs } from "../../../infra/page-keys";
import type { SubscribePageInput } from "./schema";

const logger = createLogger("pages:ws:subscribe-page");

/**
 * subscribePage WS handler
 *
 * Architecture mirrors subscribe-board exactly.
 * Gateway is stateless: no S3, no Y.Doc, no state merging.
 * Client must fetch snapshot via GraphQL getPageSnapshot BEFORE subscribing.
 *
 * Workflow:
 * 1. Auth from socket.data
 * 2. DB collaborator + page check
 * 3. Lock status read (Redis)
 * 4. Presence tracking (Lua ZADD NX → atomic)
 * 5. Page activation (Lua ZADD + INCR epoch → if first subscriber)
 * 6. Register socket in wsRegistry
 * 7. ACK: createSuccessFrame "page:subscribe-success"
 * 8. Replay gap (XRANGE from lastStreamId → latest, batch send "page:page-update")
 * 9. Broadcast user-joined (if isFirstJoin=1)
 */
export const subscribePageHandler = async (
  ctx: WSHandlerContext,
  socket: ChatWebSocket,
  input: SubscribePageInput
) => {
  const { userId, socketId } = socket.data;
  const { pageId, lastStreamId } = input;

  // Step 1 — DB collaborator check
  // TODO: const collaborator = await ctx.db.pageCollaborator.findFirst({
  //   where: { pageId, userId },
  //   select: { id: true, page: { select: { id: true, deletedAt: true, isArchived: true, isLocked: true } } },
  // })
  // if (!collaborator) { socket.send(createErrorFrame(undefined, "page:subscribe-error", "FORBIDDEN", "Not a collaborator")); return }
  // if (collaborator.page.deletedAt) { socket.send(createErrorFrame(undefined, "page:subscribe-error", "NOT_FOUND", "Page deleted")); return }

  // Step 2 — Lock status (best-effort read-only, enforcement is in page-update handler)
  // TODO: const isLocked = Boolean(await appRedis.get(PageKeys.PageLock(pageId)))

  // Step 3 — Presence tracking (inline Lua — load SHAs at startup in production)
  const presenceScript = `
    local key = KEYS[1]
    local ts = tonumber(ARGV[1])
    local userId = ARGV[2]
    local ttl = tonumber(ARGV[3])
    local isFirst = redis.call('ZADD', key, 'NX', ts, userId)
    if isFirst == 0 then redis.call('ZADD', key, ts, userId) end
    redis.call('EXPIRE', key, ttl)
    local count = redis.call('ZCARD', key)
    return {isFirst, count}
  `;
  const timestamp = Date.now();
  // TODO: const [isFirstJoin, subscriberCount] = await appRedis.eval(presenceScript, 1, PageKeys.PageSubscribers(pageId), timestamp.toString(), userId, PageTTLs.SUBSCRIBERS.toString()) as [number, number]

  // Step 4 — Page activation (if first subscriber)
  // TODO: if (subscriberCount === 1) {
  //   const activationScript = `
  //     local activeKey = KEYS[1]; local epochKey = KEYS[2]
  //     redis.call('ZADD', activeKey, tonumber(ARGV[1]), ARGV[2])
  //     return redis.call('INCR', epochKey)
  //   `
  //   await appRedis.eval(activationScript, 2, PageKeys.SysActivePages(), PageKeys.SysPagesEpoch(), timestamp.toString(), pageId)
  // }

  // Step 5 — Register socket
  // TODO: await wsRegistry.subscribe(socketId, PageKeys.PageEvents(pageId))

  // Step 6 — ACK
  // TODO: socket.send(createSuccessFrame(undefined, "page:subscribe-success", { pageId, isLocked, subscriberCount }))

  // Step 7 — Replay gap
  // TODO: if (lastStreamId && lastStreamId !== "0-0") {
  //   const missing = await appRedis.xrange(PageKeys.PageStream(pageId), `(${lastStreamId}`, "+", "COUNT", 5000) as Array<[string, string[]]>
  //   for (const [id, fields] of missing) {
  //     const data: Record<string, string> = {}
  //     for (let i = 0; i < fields.length; i += 2) data[fields[i]] = fields[i + 1]
  //     socket.send(createSuccessFrame(undefined, "page:page-update", { pageId: data.pageId, streamId: id, update: data.update, userId: data.userId }))
  //   }
  // }

  // Step 8 — Broadcast user-joined (if isFirstJoin)
  // TODO: if (isFirstJoin === 1) {
  //   const user = await ctx.db.user.findUnique({ where: { id: userId }, select: { id: true, fullName: true, avatarUrl: true } })
  //   if (user) await appRedis.publish(PageKeys.PageEvents(pageId), createSuccessFrame(undefined, "page:user-joined", { pageId, userId, fullName: user.fullName, avatarUrl: user.avatarUrl, timestamp }))
  // }

  logger.info("subscribe-page: not yet implemented (stub returned)", {
    pageId,
    userId,
  });
  socket.send(
    createErrorFrame(
      undefined,
      "page:subscribe-error",
      "INTERNAL_SERVER_ERROR",
      "subscribePageHandler not yet implemented"
    )
  );
};
