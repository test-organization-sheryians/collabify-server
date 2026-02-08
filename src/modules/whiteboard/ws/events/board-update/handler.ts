import { WSHandlerContext } from "@/infra/ws/types";
import {
  ChatWebSocket,
  createSuccessFrame,
  createErrorFrame,
} from "@/infra/ws/types";
import { BoardUpdateInput } from "./schema";
import { logger } from "@/shared/logger";
import { AppError } from "@/shared/errors/app-error";
import { appRedis } from "@/infra/redis";
import {
  WhiteboardKeys,
  WhiteboardTTLs,
} from "@/modules/whiteboard/infra/whiteboard-keys";
import { executeAtomicBoardUpdate } from "@/modules/whiteboard/infra/lua-scripts";
import { validateYjsUpdate } from "@/modules/whiteboard/utils/validate-yjs-update";

/**
 * Board Update Handler (V4 Stateless Gateway Architecture)
 *
 * **Critical Path:** <10ms p95 latency target
 *
 * **Architectural Decisions:**
 * - Stateless gateway pattern: NO S3 access, NO stream reads, NO Y.Doc merging
 * - Dedupe atomicity: Moved into Lua script to prevent data loss on gateway crash
 * - Ordering: Redis Stream ID is source of truth (no separate sequence counter)
 * - Lock enforcement: Best-effort cache check (GraphQL layer provides authoritative enforcement)
 * - Pub/Sub broadcast: Best-effort delivery (GraphQL + state vector handle recovery)
 *
 * **Flow:**
 * 1. Authorization: Subscriber check + lock check (Redis-only, no DB hits)
 * 2. Binary validation: Base64 decode + size limit + Yjs structure
 * 3. Atomic append: Lua script handles dedupe + backpressure + stream append
 * 4. ACK to sender: Durability guarantee before broadcast
 * 5. Broadcast: Pub/Sub to other subscribers
 */
export const boardUpdateHandler = async (
  ctx: WSHandlerContext,
  socket: ChatWebSocket,
  input: BoardUpdateInput
) => {
  const { boardId, update, dedupeId } = input;
  const { userId } = socket.data;
  const startTime = Date.now();

  logger.info({
    msg: "Processing board update",
    userId,
    boardId,
    dedupeId,
    updateSize: update.length,
  });

  try {
    // Authorization: Ensure user has access and board is not locked
    const subscriberKey = WhiteboardKeys.BoardSubscribers(boardId);
    const isSubscribed = await appRedis.zscore(subscriberKey, userId);

    if (isSubscribed === null) {
      throw new AppError(
        "You must subscribe to the board before sending updates",
        "NOT_SUBSCRIBED"
      );
    }

    // Lock check (eventually consistent - authoritative enforcement in GraphQL)
    const lockKey = WhiteboardKeys.BoardLock(boardId);
    const isLocked = await appRedis.get(lockKey);

    if (isLocked === "1") {
      throw new AppError("Board is currently locked", "BOARD_LOCKED");
    }

    // Binary validation
    let updateBinary: Uint8Array;
    try {
      updateBinary = Buffer.from(update, "base64");
    } catch (err) {
      throw new AppError("Update must be Base64 encoded", "INVALID_ENCODING");
    }

    const MAX_UPDATE_SIZE = 5 * 1024 * 1024; // 5MB DoS protection
    if (updateBinary.length > MAX_UPDATE_SIZE) {
      throw new AppError(
        `Update size ${updateBinary.length} exceeds maximum ${MAX_UPDATE_SIZE} bytes`,
        "UPDATE_TOO_LARGE"
      );
    }

    const isValid = validateYjsUpdate(updateBinary);
    if (!isValid) {
      throw new AppError("Malformed Yjs update binary", "INVALID_YJSUPDATE");
    }

    // Atomic append via Lua (dedupe + backpressure + stream append)
    const streamKey = WhiteboardKeys.BoardStream(boardId);
    const dedupeKey = WhiteboardKeys.DedupeKey(boardId, dedupeId);
    const timestamp = Date.now();

    let result = await executeAtomicBoardUpdate(
      appRedis,
      streamKey,
      dedupeKey,
      boardId,
      update,
      userId,
      dedupeId,
      timestamp,
      WhiteboardTTLs.DEDUPE_KEY
    );

    if (!result.ok) {
      if (result.code === "DUPLICATE") {
        logger.debug(
          { dedupeId, boardId },
          "Duplicate update (Lua atomic check)"
        );

        socket.send(
          createSuccessFrame(dedupeId, "whiteboard:update-ack", {
            status: "duplicate",
            boardId,
          })
        );
        return;
      }

      if (result.code === "BACKPRESSURE_LIMIT") {
        logger.warn(
          { boardId, streamLen: result.streamLen, maxLen: result.maxLen },
          "Stream backpressure limit reached - snapshot required"
        );

        // TODO (Architecture): Trigger snapshot job automatically when backpressure hits
        throw new AppError(
          `Board stream is full (${result.streamLen}/${result.maxLen}). Snapshot creation in progress.`,
          "RATE_LIMIT_EXCEEDED"
        );
      }

      throw new Error(`Unexpected Lua error: ${result.code}`);
    }

    // ACK sender (durability guarantee)
    socket.send(
      createSuccessFrame(dedupeId, "whiteboard:update-ack", {
        status: "sent",
        streamId: result.streamId,
        boardId,
      })
    );

    // Broadcast to other subscribers (best-effort)
    const channel = WhiteboardKeys.BoardEvents(boardId);

    await appRedis.publish(
      channel,
      JSON.stringify({
        event: "whiteboard:board-update",
        payload: {
          boardId,
          streamId: result.streamId,
          update,
          userId,
          timestamp,
        },
      })
    );

    const duration = Date.now() - startTime;

    logger.info({
      msg: "Board update processed successfully",
      boardId,
      userId,
      dedupeId,
      streamId: result.streamId,
      duration,
    });

    // TODO: Integrate metrics pipeline (histogram: latency, counter: success, gauge: update_size)
  } catch (err: unknown) {
    const duration = Date.now() - startTime;

    logger.error(
      {
        err,
        boardId,
        userId,
        dedupeId,
        duration,
      },
      "Failed to process board update"
    );

    if (err instanceof AppError) {
      socket.send(
        createErrorFrame(
          dedupeId,
          "whiteboard:board-update",
          err.code,
          err.message
        )
      );
    } else {
      socket.send(
        createErrorFrame(
          dedupeId,
          "whiteboard:board-update",
          "INTERNAL_ERROR",
          "Failed to process update"
        )
      );
    }

    // TODO: Add error metrics with error code bucketing
  }
};
