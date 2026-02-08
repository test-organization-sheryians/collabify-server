import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { UpdateBoardDescriptionInput } from "./types";

/**
 * Update Board Description Handler
 *
 * Updates the whiteboard description.
 * User must be a collaborator to update.
 */
export const handler = async (
  input: UpdateBoardDescriptionInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  const { boardId, description } = input;

  try {
    // 1. Check if user is a collaborator
    const collaborator = await ctx.db.whiteboardCollaborator.findFirst({
      where: {
        whiteboardId: boardId,
        userId,
      },
    });

    if (!collaborator) {
      throw AppError.forbidden("You do not have access to this whiteboard");
    }

    // 2. Update the board description
    const board = await ctx.db.whiteboard.update({
      where: { id: boardId },
      data: { description },
    });

    return board;
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to update whiteboard description");
  }
};
