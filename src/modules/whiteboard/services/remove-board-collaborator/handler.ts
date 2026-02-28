import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type {
  RemoveBoardCollaboratorInput,
  RemoveBoardCollaboratorResult,
} from "./types";

/**
 * Remove Board Collaborator Handler
 *
 * Revokes user access to a whiteboard.
 * Only the creator can remove collaborators.
 */
export const handler = async (
  input: RemoveBoardCollaboratorInput,
  ctx: ServiceContext
): Promise<RemoveBoardCollaboratorResult> => {
  const { userId: requesterId } = ctx.auth;
  if (!requesterId) throw AppError.unauthorized("User not authenticated");

  const { boardId, userId } = input;

  try {
    // 1. Get board and check if requester is the creator
    const board = await ctx.db.whiteboard.findUnique({
      where: { id: boardId },
      select: {
        id: true,
        createdBy: true,
      },
    });

    if (!board) {
      throw AppError.notFound("Whiteboard not found");
    }

    // Only creator can remove collaborators
    if (board.createdBy !== requesterId) {
      throw AppError.forbidden("Only the creator can remove collaborators");
    }

    // 2. Remove the collaborator
    await ctx.db.whiteboardCollaborator.deleteMany({
      where: {
        whiteboardId: boardId,
        userId,
      },
    });

    // TODO: If user is currently subscribed, send 'whiteboard:user-removed' event

    return {
      success: true,
    };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to remove collaborator");
  }
};
