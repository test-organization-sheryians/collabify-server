import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { RenameBoardInput } from "./types";

/**
 * renameBoard — Service Handler
 *
 * Auth:
 *   - assertBoardCollaborator — cache-backed; FORBIDDEN if not a collaborator
 *   - permissions.assert("whiteboard:update") — RBAC check
 */
export const handler = async (input: RenameBoardInput, ctx: ServiceContext) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const { boardId, title } = input;

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

    // Step 2 — update title
    const board = await ctx.db.whiteboard.update({
      where: { id: boardId },
      data: { title },
    });

    return board;
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to rename whiteboard");
  }
};
