import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { GetProjectBoardsInput } from "./types";
import type { BoardConnection } from "../get-user-boards/types";

/**
 * Get Project Boards Handler
 *
 * Fetches all boards in a specific project with pagination.
 * User must be a project member to view.
 */
export const handler = async (
  input: GetProjectBoardsInput,
  ctx: ServiceContext
): Promise<BoardConnection> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  const { projectId, limit, cursor } = input;

  try {
    // 1. Get project and verify access
    const project = await ctx.db.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        workspaceId: true,
      },
    });

    if (!project) {
      throw AppError.notFound("Project not found");
    }

    // 2. Check if user is a project member or workspace member
    const [projectMember, workspaceMember] = await Promise.all([
      ctx.db.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId,
          },
        },
      }),
      ctx.db.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: project.workspaceId,
            userId,
          },
        },
      }),
    ]);

    if (!projectMember && !workspaceMember) {
      throw AppError.forbidden("You do not have access to this project");
    }

    // 3. Fetch boards with pagination
    const where = {
      projectId,
      ...(cursor && { id: { lt: cursor } }),
      deletedAt: null,
    };

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
    throw new AppError("Failed to fetch project boards");
  }
};
