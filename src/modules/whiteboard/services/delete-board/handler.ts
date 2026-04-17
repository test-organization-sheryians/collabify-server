import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import { appRedis } from "@/infra/redis";
import { createSuccessFrame } from "@/infra/ws/types";
import { WhiteboardKeys } from "../../infra/whiteboard-keys";
import { cleanupBoardResources } from "./cleanup";
import { orphanMentions } from "@/modules/mention/services";
import type { DeleteBoardInput, DeleteBoardResult } from "./types";

const logger = createLogger("whiteboard:services:delete-board");

/**
 * deleteBoard — Service Handler
 *
 * Soft-deletes a whiteboard. Only the creator can delete.
 *
 * Auth:
 *   - assertBoardCollaborator — cache-backed membership gate
 *   - permissions.assert("whiteboard:delete") — RBAC check
 * Note: creator-only rule preserved after auth gate
 */
export const handler = async (
  input: DeleteBoardInput,
  ctx: ServiceContext
): Promise<DeleteBoardResult> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const { boardId } = input;

  try {
    // Step 1 — collaborator gate (cache-backed)
    const cachedBoard = await ctx.authGate.getBoard(boardId);
    if (!cachedBoard) throw AppError.notFound("Whiteboard not found");
    const proj = await ctx.authGate.getProject(cachedBoard.projectId);
    const scope = {
      type: "resource" as const,
      id: boardId,
      projectId: cachedBoard.projectId,
      workspaceId: proj?.workspaceId ?? "",
    };
    await Promise.all([
      ctx.authGate.assertBoardCollaborator(boardId),
      ctx.permissions.assert("whiteboard:delete", scope),
    ]);

    // Step 2 — fetch board + creator check, soft-delete atomically
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

      if (!found) throw AppError.notFound("Whiteboard not found");
      if (found.deletedAt)
        throw AppError.badRequest("Whiteboard already deleted");
      if (found.createdBy !== userId)
        throw AppError.forbidden("Only the creator can delete this whiteboard");

      return tx.whiteboard.update({
        where: { id: boardId },
        data: { deletedAt: new Date() },
        select: { id: true, workspaceId: true },
      });
    });

    await orphanMentions.handler({ targetEntityId: boardId }, ctx);

    logger.info("Board soft-deleted", {
      boardId,
      deletedBy: userId,
      workspaceId: board.workspaceId,
    });

    const boardDeletedFrame = createSuccessFrame(
      undefined,
      "whiteboard:board-deleted",
      {
        boardId,
        deletedBy: userId,
        timestamp: new Date().toISOString(),
      }
    );

    appRedis
      .publish(WhiteboardKeys.BoardEvents(boardId), boardDeletedFrame)
      .catch((err) =>
        logger.error("Failed to publish board:deleted event", { boardId, err })
      );

    cleanupBoardResources(boardId, appRedis).catch((err) =>
      logger.error("Board resource cleanup failed", { boardId, err })
    );

    return { success: true, boardId };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to delete whiteboard", { boardId, err: error });
    throw new AppError("Failed to delete whiteboard");
  }
};
