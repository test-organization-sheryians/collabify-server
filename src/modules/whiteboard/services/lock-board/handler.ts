import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { LockBoardInput } from "./types";

/**
 * lockBoard — Service Handler
 *
 * Auth:
 *   - assertBoardCollaborator — cache-backed; FORBIDDEN if not a collaborator
 *   - permissions.assert("whiteboard:update") — RBAC check
 * Note: creator-only rule preserved after auth gate
 */
export const handler = async (input: LockBoardInput, ctx: ServiceContext) => {
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
      ctx.permissions.assert("whiteboard:update", scope),
    ]);

    // Step 2 — creator-only sub-check
    const board = await ctx.db.whiteboard.findUnique({
      where: { id: boardId },
      select: { createdBy: true },
    });
    if (!board) throw AppError.notFound("Whiteboard not found");
    if (board.createdBy !== userId)
      throw AppError.forbidden("Only the creator can lock this board");

    const updatedBoard = await ctx.db.whiteboard.update({
      where: { id: boardId },
      data: { isLocked: true },
    });

    return updatedBoard;
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to lock whiteboard");
  }
};
