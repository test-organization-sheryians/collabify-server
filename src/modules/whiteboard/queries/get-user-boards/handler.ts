import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { GetUserBoardsInput, BoardConnection } from "./types";

/**
 * getUserBoards — Query Handler
 *
 * Auth:
 *   - assertWorkspaceMember — cache-backed; FORBIDDEN if not a member
 *   - permissions.assert("whiteboard:read") — RBAC check
 */
export const handler = async (
  input: GetUserBoardsInput,
  ctx: ServiceContext
): Promise<BoardConnection> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const { workspaceId, projectId, limit, cursor } = input;

  try {
    // Step 1 — auth gate (cache-backed)
    // Use project scope when projectId provided for correct RBAC
    const scope = projectId
      ? { type: "project" as const, id: projectId, workspaceId }
      : { type: "workspace" as const, id: workspaceId };
    await Promise.all([
      ctx.authGate.assertWorkspaceMember(workspaceId),
      ctx.permissions.assert("whiteboard:read", scope),
    ]);

    // Step 2 — fetch user's boards (creator or collaborator)
    // When projectId is given, scope to that project only
    const where = {
      workspaceId,
      ...(projectId && { projectId }),
      ...(cursor && { id: { lt: cursor } }),
      OR: [{ createdBy: userId }, { collaborators: { some: { userId } } }],
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

    return { boards: results, nextCursor };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to fetch user boards");
  }
};
