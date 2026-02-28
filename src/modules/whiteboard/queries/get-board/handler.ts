import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { GetBoardInput } from "./types";

/**
 * Get Board Handler
 *
 * Fetches a single whiteboard by ID.
 * User must be a collaborator to view.
 */
export const handler = async (input: GetBoardInput, ctx: ServiceContext) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  const { boardId } = input;

  try {
    // Check if user is a collaborator or creator
    const board = await ctx.db.whiteboard.findFirst({
      where: {
        id: boardId,
        OR: [
          { createdBy: userId },
          {
            collaborators: {
              some: { userId },
            },
          },
        ],
      },
    });

    if (!board) {
      throw AppError.notFound("Whiteboard not found or you do not have access");
    }

    return board;
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to fetch whiteboard");
  }
};
