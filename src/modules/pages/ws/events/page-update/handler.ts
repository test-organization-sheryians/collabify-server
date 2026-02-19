import {
  WSHandlerContext,
  ChatWebSocket,
  createSuccessFrame,
  createErrorFrame,
} from "@/infra/ws/types";
import { AppError } from "@/shared/errors/app-error";
import { createLogger } from "@/shared/lib/logger";
import { appRedis } from "@/infra/redis";
import { PageKeys, PageTTLs } from "../../../infra/page-keys";
import { validatePageUpdate } from "../../../infra/page-validator";
import type { PageUpdateInput } from "./schema";

const logger = createLogger("pages:ws:page-update");

/**
 * pageUpdate WS handler — HOT PATH (<10ms target)
 *
 * Architecture: Stateless gateway (mirrors board-update exactly).
 * No S3, no Y.Doc, no stream reads. Just: validate → dedupe+append (Lua) → ACK → broadcast.
 *
 * Workflow:
 * 1. Subscriber check (ZSCORE — no DB hit)
 * 2. Lock check (Redis GET — best-effort, authoritative enforcement in GraphQL)
 * 3. Binary validation
 * 4. Atomic append (Lua: dedupe + backpressure + XADD MAXLEN)
 * 5. ACK sender (createSuccessFrame "page:update-ack")
 * 6. Pub/Sub broadcast with originSocketId (prevents self-echo)
 */
export const pageUpdateHandler = async (
  ctx: WSHandlerContext,
  socket: ChatWebSocket,
  input: PageUpdateInput
) => {
  const { userId, socketId } = socket.data;
  const { pageId, update, dedupeId } = input;
  const startTime = Date.now();

  logger.info("Processing page update", {
    userId,
    pageId,
    dedupeId,
    updateSize: update.length,
  });

  try {
    // Step 1 — Subscriber check (Redis-only, no DB)
    // TODO: const isSubscribed = await appRedis.zscore(PageKeys.PageSubscribers(pageId), userId)
    // if (isSubscribed === null) throw new AppError("Must subscribe before sending updates", "NOT_SUBSCRIBED")

    // Step 2 — Lock check (eventually consistent — best-effort)
    // TODO: const lockOwner = await appRedis.get(PageKeys.PageLock(pageId))
    // if (lockOwner && lockOwner !== userId) throw new AppError("Page is currently locked", "PAGE_LOCKED")

    // Step 3 — Binary validation
    // TODO: const updateBinary = Buffer.from(update, "base64")
    // isValid = validatePageUpdate(update)  // uses page-validator
    // if (!isValid.ok) throw new AppError(isValid.reason, "INVALID_YJSUPDATE")

    // Step 4 — Atomic XADD (same pattern as executeAtomicBoardUpdate)
    // TODO: const streamKey = PageKeys.PageStream(pageId)
    // const dedupeKey = PageKeys.PageDedupe(pageId, dedupeId)
    // const result = await appRedis.eval(ATOMIC_PAGE_UPDATE_SCRIPT, 2, streamKey, dedupeKey, PageTTLs.DEDUPE, update, pageId, userId, dedupeId, Date.now())
    // Handle: ok, DUPLICATE, BACKPRESSURE_LIMIT

    // Step 5 — ACK
    // TODO: socket.send(createSuccessFrame(dedupeId, "page:update-ack", { dedupeId, status: "sent", streamId: result.streamId, pageId }))

    // Step 6 — Pub/Sub broadcast (with originSocketId for self-echo prevention)
    // TODO: const frame = createSuccessFrame(undefined, "page:page-update", { pageId, streamId: result.streamId, update, userId, timestamp: Date.now() })
    // await appRedis.publish(PageKeys.PageEvents(pageId), JSON.stringify({ message: frame, originSocketId: socketId }))

    logger.debug("page-update: not yet implemented", {
      pageId,
      userId,
      duration: Date.now() - startTime,
    });
    throw new AppError(
      "pageUpdateHandler: not yet implemented",
      "INTERNAL_SERVER_ERROR"
    );
  } catch (err: unknown) {
    logger.error("Failed to process page update", {
      err,
      pageId,
      userId,
      dedupeId,
    });
    if (err instanceof AppError) {
      socket.send(
        createErrorFrame(dedupeId, "page:page-update", err.code, err.message)
      );
    } else {
      socket.send(
        createErrorFrame(
          dedupeId,
          "page:page-update",
          "INTERNAL_ERROR",
          "Failed to process update"
        )
      );
    }
  }
};
