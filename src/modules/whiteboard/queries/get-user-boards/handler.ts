import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { GetUserBoardsInput, BoardConnection } from "./types";

/**
 * Get User Boards Handler
 *
 * Fetches all boards the user has access to (via WhiteboardCollaborator or creator).
 * Supports cursor-based pagination.
 */
export const handler = async (
  input: GetUserBoardsInput,
  ctx: ServiceContext
): Promise<BoardConnection> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  const { workspaceId, limit, cursor } = input;

  try {
    // Build where clause for pagination
    const where = {
      workspaceId,
      ...(cursor && { id: { lt: cursor } }), // Cursor-based pagination
      OR: [
        { createdBy: userId },
        {
          collaborators: {
            some: { userId },
          },
        },
      ],
      deletedAt: null, // Exclude deleted boards
    };

    // Fetch boards with limit + 1 to check if there's a next page
    const boards = await ctx.db.whiteboard.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit + 1,
    });

    // Check if there are more results
    const hasNextPage = boards.length > limit;
    const results = hasNextPage ? boards.slice(0, limit) : boards;
    const nextCursor = hasNextPage ? results[results.length - 1].id : null;

    return {
      boards: results,
      nextCursor,
    };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to fetch user boards");
  }
};
