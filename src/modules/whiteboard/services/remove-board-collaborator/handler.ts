import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type {
  RemoveBoardCollaboratorInput,
  RemoveBoardCollaboratorResult,
} from "./types";

/**
 * removeBoardCollaborator — Service Handler
 *
 * Auth:
 *   - assertBoardCollaborator — cache-backed membership gate
 *   - permissions.assert("whiteboard:collaborator:remove") — RBAC check
 * Note: creator-only rule preserved after auth gate
 */
export const handler = async (
  input: RemoveBoardCollaboratorInput,
  ctx: ServiceContext
): Promise<RemoveBoardCollaboratorResult> => {
  const { userId: requesterId } = ctx.auth;
  if (!requesterId) throw AppError.unauthorized("User not authenticated");
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const { boardId, userId } = input;

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
      ctx.permissions.assert("whiteboard:collaborator:remove", scope),
    ]);

    // Step 2 — creator-only sub-check
    const board = await ctx.db.whiteboard.findUnique({
      where: { id: boardId },
      select: { createdBy: true },
    });
    if (!board) throw AppError.notFound("Whiteboard not found");
    if (board.createdBy !== requesterId)
      throw AppError.forbidden("Only the creator can remove collaborators");

    // Step 3 — remove collaborator
    await ctx.db.whiteboardCollaborator.deleteMany({
      where: { whiteboardId: boardId, userId },
    });

    return { success: true };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to remove collaborator");
  }
};
