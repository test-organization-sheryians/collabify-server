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
import {
  PRESENCE_TRACKING_SCRIPT,
  PAGE_ACTIVATION_SCRIPT,
} from "../../../infra/lua/presence";
import type { SubscribePageInput } from "./schema";

const logger = createLogger("pages:ws:subscribe-page");

/**
 * subscribePage — WS event handler
 *
 * Gateway is stateless: no Y.Doc, no S3, no state merging.
 * Client must call getPageSnapshot via GraphQL BEFORE subscribing.
 *
 * See README.md for full system design.
 */
export const subscribePageHandler = async (
  ctx: WSHandlerContext,
  socket: ChatWebSocket,
  input: SubscribePageInput
) => {
  const { userId, socketId } = socket.data;
  const { pageId, lastStreamId } = input;

  // ─── Step 1: Auth ────────────────────────────────────────────────────────────

  const collaborator = await ctx.db.pageCollaborator.findFirst({
    where: { pageId, userId },
    select: {
      id: true,
      page: {
        select: { id: true, deletedAt: true, isArchived: true },
      },
    },
  });

  if (!collaborator) {
    socket.send(
      createErrorFrame(
        undefined,
        "page:subscribe-error",
        "FORBIDDEN",
        "Not a collaborator on this page"
      )
    );
    return;
  }

  if (collaborator.page.deletedAt) {
    socket.send(
      createErrorFrame(
        undefined,
        "page:subscribe-error",
        "NOT_FOUND",
        "Page has been deleted"
      )
    );
    return;
  }

  // Archived pages: allowed (read-only is enforced in page-update handler, not here)

  // ─── Step 2: Lock status (informational — enforcement is in page-update) ──────

  const isLocked = Boolean(await appRedis.get(PageKeys.PageLock(pageId)));

  // ─── Step 3: Presence tracking (Lua atomic, 1 RTT) ───────────────────────────

  const timestamp = Date.now();
  const [isNew, subscriberCount] = (await appRedis.eval(
    PRESENCE_TRACKING_SCRIPT,
    1,
    PageKeys.PageSubscribers(pageId),
    userId,
    timestamp.toString(),
    PageTTLs.SUBSCRIBERS.toString()
  )) as [number, number];

  logger.info("Presence updated", {
    pageId,
    userId,
    subscriberCount,
    isNew: isNew === 1,
  });

  // ─── Step 4: Page activation (only if this is the first subscriber) ───────────

  if (subscriberCount === 1) {
    await appRedis.eval(
      PAGE_ACTIVATION_SCRIPT,
      2,
      PageKeys.SysActivePages(),
      PageKeys.SysPagesEpoch(),
      pageId,
      timestamp.toString()
    );
    logger.info("Page activated", { pageId });
  }

  // ─── Step 5: Subscribe socket to BOTH channels ───────────────────────────────
  // Pages: two separate channels (content updates + awareness cursors)
  // Whiteboard: only subscribes to one (events).

  await wsRegistry.subscribe(socketId, PageKeys.PageEvents(pageId));
  await wsRegistry.subscribe(socketId, PageKeys.PageAwareness(pageId));

  // ─── Step 6: Fetch active collaborators (batch — no DataLoader in WS handlers) ─

  const activeUserIds = await appRedis.zrange(
    PageKeys.PageSubscribers(pageId),
    0,
    -1
  );

  const users = await ctx.db.user.findMany({
    where: { id: { in: activeUserIds } },
    select: { id: true, fullName: true, avatarUrl: true },
  });

  const collaborators = users.map((u) => ({
    userId: u.id,
    fullName: u.fullName ?? "Unknown",
    avatarUrl: u.avatarUrl ?? null,
  }));

  // ─── Step 7: Send subscribe-success ─────────────────────────────────────────

  socket.send(
    createSuccessFrame(undefined, "page:subscribe-success", {
      pageId,
      isLocked,
      subscriberCount,
      collaborators,
    })
  );

  // ─── Step 7: Replay gap ───────────────────────────────────────────────────────
  // Send updates from lastStreamId → latest to THIS socket only.
  // "0-0" = first open after GraphQL snapshot → no replay needed.

  if (lastStreamId && lastStreamId !== "0-0") {
    try {
      const missing = (await appRedis.xrange(
        PageKeys.PageStream(pageId),
        `(${lastStreamId}`, // exclusive start: AFTER lastStreamId
        "+",
        "COUNT",
        5000
      )) as Array<[string, string[]]>;

      if (missing.length > 0) {
        logger.info("Replaying gap", {
          pageId,
          userId,
          count: missing.length,
          from: lastStreamId,
        });

        for (const [id, fields] of missing) {
          const data: Record<string, string> = {};
          for (let i = 0; i < fields.length; i += 2)
            data[fields[i]] = fields[i + 1];

          socket.send(
            createSuccessFrame(undefined, "page:page-update", {
              pageId: data.pageId,
              streamId: id,
              update: data.update,
              userId: data.userId,
              timestamp: data.timestamp,
            })
          );
        }
      }
    } catch (replayErr) {
      // Non-fatal: state vector sync handles any remaining gap
      logger.error("Replay gap failed (non-fatal)", {
        pageId,
        userId,
        err: replayErr,
      });
    }
  }

  // ─── Step 8: Broadcast user-joined (only if isNew=1) ─────────────────────────
  // isNew=0: reconnect / second tab → skip to avoid notification spam

  if (isNew === 1) {
    const user = await ctx.db.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, avatarUrl: true },
    });

    if (user) {
      await appRedis.publish(
        PageKeys.PageEvents(pageId),
        createSuccessFrame(undefined, "page:user-joined", {
          pageId,
          userId: user.id,
          fullName: user.fullName ?? "Unknown",
          avatarUrl: user.avatarUrl ?? null,
          timestamp,
        })
      );
      logger.info("User-joined broadcast sent", { pageId, userId });
    }
  } else {
    logger.info("User reconnected — no join broadcast", { pageId, userId });
  }
};
