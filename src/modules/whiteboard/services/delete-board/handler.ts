import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { DeleteBoardInput, DeleteBoardResult } from "./types";

/**
 * Delete Board Handler
 *
 * Soft-deletes a whiteboard by setting deletedAt timestamp.
 * Only the creator or workspace admin can delete a board.
 */
export const handler = async (
  input: DeleteBoardInput,
  ctx: ServiceContext
): Promise<DeleteBoardResult> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  const { boardId } = input;

  try {
    // 1. Fetch the board and check if user is the creator
    const board = await ctx.db.whiteboard.findUnique({
      where: { id: boardId },
      select: {
        id: true,
        createdBy: true,
        workspaceId: true,
        deletedAt: true,
      },
    });

    if (!board) {
      throw AppError.notFound("Whiteboard not found");
    }

    if (board.deletedAt) {
      throw AppError.badRequest("Whiteboard already deleted");
    }

    // 2. Authorization: Only creator can delete (for now, core-first approach)
    if (board.createdBy !== userId) {
      throw AppError.forbidden("Only the creator can delete this whiteboard");
    }

    // 3. Soft delete the board
    await ctx.db.whiteboard.update({
      where: { id: boardId },
      data: {
        deletedAt: new Date(),
      },
    });

    // TODO: Archive S3 snapshots (move to deleted/ prefix)
    // TODO: Remove from active Redis streams
    // TODO: Notify connected users via WebSocket

    return {
      success: true,
      boardId,
    };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to delete whiteboard");
  }
};
