import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { GetBoardCollaboratorsInput, BoardCollaborator } from "./types";

/**
 * Get Board Collaborators Handler
 *
 * Fetches all collaborators with access to a board.
 * User must be a collaborator or creator to view.
 */
export const handler = async (
  input: GetBoardCollaboratorsInput,
  ctx: ServiceContext
): Promise<BoardCollaborator[]> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  const { boardId } = input;

  try {
    // Check if user has access to the board
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
      throw AppError.forbidden(
        "Whiteboard not found or you do not have access"
      );
    }

    // Fetch collaborators with user info
    const collaborators = await ctx.db.whiteboardCollaborator.findMany({
      where: { whiteboardId: boardId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    // Transform to match GraphQL schema (handle fullName null)
    return collaborators.map((c) => ({
      userId: c.userId,
      joinedAt: c.joinedAt,
      user: {
        id: c.user.id,
        fullName: c.user.fullName ?? "Unknown User",
        email: c.user.email,
        avatarUrl: c.user.avatarUrl,
      },
    }));
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to fetch board collaborators");
  }
};
