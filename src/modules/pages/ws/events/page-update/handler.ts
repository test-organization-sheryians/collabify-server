import { AppError } from "@/shared/errors";
import { createErrorFrame } from "@/infra/ws/types";
import { createLogger } from "@/shared/lib/logger";
import type { WSHandlerContext, ChatWebSocket } from "@/infra/ws/types";
import type { PageUpdateInput } from "./schema";

import { checkAuth } from "./steps/check-auth";
import { validateUpdate } from "./steps/validate-update";
import { appendToStream } from "./steps/append-to-stream";
import { broadcast, ackDuplicate } from "./steps/broadcast";

const logger = createLogger("pages:ws:page-update");

/**
 * pageUpdate — WS Event Handler (stateless gateway, hot path <10ms)
 *
 * Execution order:
 *   1+2. checkAuth       — ZSCORE subscriber + GET lock (2 Redis RTTs)
 *   3.   validateUpdate  — base64 decode + size check (sync, no I/O)
 *   4.   appendToStream  — Lua ATOMIC_PAGE_UPDATE_SCRIPT (1 Redis RTT)
 *   5+6. broadcast       — ACK sender + PUBLISH to page:events (1 Redis RTT)
 *
 * Total Redis RTTs: ~3  |  Target: <10ms p95
 *
 * No S3, no Y.Doc, no stream reads — pure gateway.
 * See README.md for full system design.
 */
export const pageUpdateHandler = async (
  ctx: WSHandlerContext,
  socket: ChatWebSocket,
  input: PageUpdateInput
): Promise<void> => {
  const { pageId, update, dedupeId } = input;
  const { userId, socketId } = socket.data;
  const startTime = Date.now();

  logger.info("Processing page update", {
    userId,
    pageId,
    dedupeId,
    updateSize: update.length,
  });

  try {
    // 1+2. Auth guards (subscriber check + lock check)
    await checkAuth(pageId, userId, ctx.redis);

    // 3. Binary validation (sync — no I/O)
    validateUpdate(update);

    // 4. Atomic stream append (Lua: dedupe + backpressure + XADD)
    const result = await appendToStream(
      pageId,
      userId,
      update,
      dedupeId,
      ctx.redis
    );

    if (result.status === "duplicate") {
      ackDuplicate(socket, dedupeId, pageId);
      return;
    }

    // 5+6. ACK sender + Pub/Sub broadcast
    await broadcast(socket, ctx.redis, {
      pageId,
      userId,
      dedupeId,
      socketId,
      streamId: result.streamId,
      update,
    });

    logger.info("Page update processed", {
      pageId,
      userId,
      dedupeId,
      streamId: result.streamId,
      latencyMs: Date.now() - startTime,
    });
  } catch (err: unknown) {
    logger.error("Failed to process page update", {
      err,
      pageId,
      userId,
      dedupeId,
      latencyMs: Date.now() - startTime,
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
