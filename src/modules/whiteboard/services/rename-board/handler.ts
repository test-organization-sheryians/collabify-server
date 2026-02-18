import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { RenameBoardInput } from "./types";

/**
 * Rename Board Handler
 *
 * Updates the whiteboard title.
 * User must be a collaborator to rename.
 */
export const handler = async (input: RenameBoardInput, ctx: ServiceContext) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  const { boardId, title } = input;

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

    // 2. Update the board title
    const board = await ctx.db.whiteboard.update({
      where: { id: boardId },
      data: { title },
    });

    // TODO: Broadcast 'whiteboard:board-renamed' event to active users

    return board;
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to rename whiteboard");
  }
};
