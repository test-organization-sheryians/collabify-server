import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { GetBoardCollaboratorsInput, BoardCollaborator } from "./types";

/**
 * getBoardCollaborators — Query Handler
 *
 * Auth:
 *   - assertBoardCollaborator — cache-backed membership gate
 *   - permissions.assert("whiteboard:collaborator:read") — RBAC check
 */
export const handler = async (
  input: GetBoardCollaboratorsInput,
  ctx: ServiceContext
): Promise<BoardCollaborator[]> => {
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
      ctx.permissions.assert("whiteboard:collaborator:read", scope),
    ]);

    // Step 2 — fetch collaborators with user info
    const collaborators = await ctx.db.whiteboardCollaborator.findMany({
      where: { whiteboardId: boardId },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    return collaborators.map((c) => ({
      userId: c.userId,
      joinedAt: c.joinedAt,
      user: {
        id: c.user.id,
        fullName: c.user.fullName ?? "Unknown User",
        email: c.user.email,
        avatarUrl: c.user.avatarUrl,
      },
    }));
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to fetch board collaborators");
  }
};
