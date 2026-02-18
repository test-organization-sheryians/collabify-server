import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import { appRedis } from "@/infra/redis";
import { createSuccessFrame } from "@/infra/ws/types";
import { WhiteboardKeys } from "../../infra/whiteboard-keys";
import { cleanupBoardResources } from "./cleanup";
import type { DeleteBoardInput, DeleteBoardResult } from "./types";

const logger = createLogger("whiteboard:services:delete-board");

/**
 * Delete Board Handler
 *
 * Soft-deletes a whiteboard by setting deletedAt timestamp.
 * Only the creator can delete a board (core-first approach).
 *
 * Post-delete:
 * 1. Broadcasts board:deleted to all connected users via Redis pub/sub
 * 2. Fire-and-forgets async cleanup of Redis keys + S3 snapshots
 */
export const handler = async (
  input: DeleteBoardInput,
  ctx: ServiceContext
): Promise<DeleteBoardResult> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  const { boardId } = input;

  try {
    // 1. Fetch board + authorization check inside a transaction for atomicity
    const board = await ctx.db.$transaction(async (tx) => {
      const found = await tx.whiteboard.findUnique({
        where: { id: boardId },
        select: {
          id: true,
          createdBy: true,
          workspaceId: true,
          deletedAt: true,
        },
      });

      if (!found) {
        throw AppError.notFound("Whiteboard not found");
      }

      if (found.deletedAt) {
        throw AppError.badRequest("Whiteboard already deleted");
      }

      if (found.createdBy !== userId) {
        throw AppError.forbidden("Only the creator can delete this whiteboard");
      }

      // 2. Soft delete with audit trail
      return tx.whiteboard.update({
        where: { id: boardId },
        data: {
          deletedAt: new Date(),
        },
        select: { id: true, workspaceId: true },
      });
    });

    logger.info("Board soft-deleted", {
      boardId,
      deletedBy: userId,
      workspaceId: board.workspaceId,
    });

    // 3. Broadcast board:deleted to all connected users via Redis pub/sub
    //
    // Pattern: publish raw createSuccessFrame string (subscribe-board pattern)
    // redis-subscriber.ts parses it, finds no `message` key, dispatches raw string to all sockets
    // Do NOT use { message, originSocketId } wrapper — we want ALL subscribers notified (no self-exclusion)
    const boardDeletedFrame = createSuccessFrame(
      undefined, // No request ID — this is a broadcast
      "whiteboard:board-deleted",
      {
        boardId,
        deletedBy: userId,
        timestamp: new Date().toISOString(),
      }
    );

    logger.info("Broadcasting board:deleted to subscribers", { boardId });
    appRedis
      .publish(WhiteboardKeys.BoardEvents(boardId), boardDeletedFrame)
      .catch((err) =>
        logger.error("Failed to publish board:deleted event", { boardId, err })
      );

    // 4. Fire-and-forget resource cleanup (Redis + S3)
    cleanupBoardResources(boardId, appRedis).catch((err) =>
      logger.error("Board resource cleanup failed", { boardId, err })
    );

    return {
      success: true,
      boardId,
    };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to delete whiteboard", { boardId, err: error });
    throw new AppError("Failed to delete whiteboard");
  }
};
