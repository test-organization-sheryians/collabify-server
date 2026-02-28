import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { GetWorkspaceBoardsInput } from "./types";
import type { BoardConnection } from "../get-user-boards/types";

/**
 * Get Workspace Boards Handler
 *
 * Admin query to fetch ALL boards in a workspace (not just user's boards).
 * Useful for workspace management, analytics, and admin dashboards.
 *
 * Authorization: User must be a workspace member (future: workspace admin only)
 */
export const handler = async (
  input: GetWorkspaceBoardsInput,
  ctx: ServiceContext
): Promise<BoardConnection> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  const { workspaceId, includeArchived, limit, cursor } = input;

  try {
    // 1. Verify user is a workspace member
    const membership = await ctx.db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!membership) {
      throw AppError.forbidden("You are not a member of this workspace");
    }

    // TODO: Future enhancement - Add workspace admin check
    // Currently all workspace members can view all boards
    // In future, restrict to workspace admins only:
    //
    // if (membership.role !== "ADMIN") {
    //   throw AppError.forbidden("Only workspace admins can view all boards");
    // }

    // 2. Build query filters
    const where = {
      workspaceId,
      ...(cursor && { id: { lt: cursor } }),
      deletedAt: null,
      ...(includeArchived ? {} : { isArchived: false }),
    };

    // 3. Fetch boards with pagination
    const boards = await ctx.db.whiteboard.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit + 1,
    });

    const hasNextPage = boards.length > limit;
    const results = hasNextPage ? boards.slice(0, limit) : boards;
    const nextCursor = hasNextPage ? results[results.length - 1].id : null;

    return {
      boards: results,
      nextCursor,
    };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to fetch workspace boards");
  }
};
