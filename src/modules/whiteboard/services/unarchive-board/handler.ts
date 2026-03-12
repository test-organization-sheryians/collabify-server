import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { UnarchiveBoardInput } from "./types";

/**
 * unarchiveBoard — Service Handler
 *
 * Auth:
 *   - assertBoardCollaborator — cache-backed membership gate
 *   - permissions.assert("board:archive") — RBAC check
 * Note: creator-only rule preserved after auth gate
 */
export const handler = async (
  input: UnarchiveBoardInput,
  ctx: ServiceContext
) => {
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
      ctx.permissions.assert("board:archive", scope),
    ]);

    if (!cachedBoard.isArchived)
      throw AppError.badRequest("Board is not archived");

    // Step 2 — creator-only sub-check
    const board = await ctx.db.whiteboard.findUnique({
      where: { id: boardId },
      select: { createdBy: true },
    });
    if (!board) throw AppError.notFound("Whiteboard not found");
    if (board.createdBy !== userId)
      throw AppError.forbidden("Only the creator can unarchive this board");

    return await ctx.db.whiteboard.update({
      where: { id: boardId },
      data: { isArchived: false },
    });
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to unarchive whiteboard");
  }
};
