import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { UpdateBoardDescriptionInput } from "./types";

/**
 * updateBoardDescription — Service Handler
 *
 * Auth:
 *   - assertBoardCollaborator — cache-backed; FORBIDDEN if not a collaborator
 *   - permissions.assert("board:update") — RBAC check
 */
export const handler = async (
  input: UpdateBoardDescriptionInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const { boardId, description } = input;

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
      ctx.permissions.assert("board:update", scope),
    ]);

    // Step 2 — update description
    const board = await ctx.db.whiteboard.update({
      where: { id: boardId },
      data: { description },
    });

    return board;
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to update whiteboard description");
  }
};
