import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { GetBoardInput } from "./types";

/**
 * getBoard — Query Handler
 *
 * Auth:
 *   - assertBoardCollaborator — cache-backed membership gate
 *   - permissions.assert("whiteboard:read") — RBAC check
 */
export const handler = async (input: GetBoardInput, ctx: ServiceContext) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const { boardId } = input;

  try {
    // Step 1 — collaborator gate (cache-backed)
    const cachedBoard = await ctx.authGate.getBoard(boardId);
    if (!cachedBoard) throw AppError.notFound("Whiteboard not found");
    const proj = await ctx.authGate.getProject(cachedBoard.projectId);
    const scope = {
      type: "resource" as const,
      id: boardId,
      projectId: cachedBoard.projectId,
      workspaceId: proj?.workspaceId ?? "",
    };
    await Promise.all([
      ctx.authGate.assertBoardCollaborator(boardId),
      ctx.permissions.assert("whiteboard:read", scope),
    ]);

    // Step 2 — fetch full board
    const board = await ctx.db.whiteboard.findUnique({
      where: { id: boardId, deletedAt: null },
    });
    if (!board) throw AppError.notFound("Whiteboard not found");

    return board;
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to fetch whiteboard");
  }
};
