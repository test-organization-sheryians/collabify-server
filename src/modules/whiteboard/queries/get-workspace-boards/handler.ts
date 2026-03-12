import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { GetWorkspaceBoardsInput } from "./types";
import type { BoardConnection } from "../get-user-boards/types";

/**
 * getWorkspaceBoards — Query Handler
 *
 * Admin query to fetch ALL boards in a workspace (not just user's boards).
 *
 * Auth:
 *   - assertWorkspaceMember — cache-backed; FORBIDDEN if not a member
 *   - permissions.assert("board:read") — RBAC check (future: admin-only via RBAC)
 */
export const handler = async (
  input: GetWorkspaceBoardsInput,
  ctx: ServiceContext
): Promise<BoardConnection> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const { workspaceId, includeArchived, limit, cursor } = input;

  try {
    // Step 1 — workspace member gate (cache-backed)
    const scope = { type: "workspace" as const, id: workspaceId };
    await Promise.all([
      ctx.authGate.assertWorkspaceMember(workspaceId),
      ctx.permissions.assert("board:read", scope),
    ]);

    // Step 2 — paginated workspace board query
    const where = {
      workspaceId,
      ...(cursor && { id: { lt: cursor } }),
      deletedAt: null,
      ...(includeArchived ? {} : { isArchived: false }),
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
    throw new AppError("Failed to fetch workspace boards");
  }
};
