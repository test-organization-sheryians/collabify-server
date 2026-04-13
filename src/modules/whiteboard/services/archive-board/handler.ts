import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { ArchiveBoardInput } from "./types";
import { emit } from "@/modules/notification/outbox/outbox-writer";

/**
 * archiveBoard — Service Handler
 *
 * Auth:
 *   - assertBoardCollaborator — cache-backed; FORBIDDEN if not a collaborator
 *   - permissions.assert("whiteboard:archive") — RBAC check
 * Note: creator-only rule preserved after auth gate
 */
export const handler = async (
  input: ArchiveBoardInput,
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
      ctx.permissions.assert("whiteboard:archive", scope),
    ]);

    if (cachedBoard.isArchived)
      throw AppError.badRequest("Board is already archived");

    // Step 2 — creator-only sub-check
    const existingBoard = await ctx.db.whiteboard.findUnique({
      where: { id: boardId },
      select: { createdBy: true, title: true },
    });
    if (!existingBoard) throw AppError.notFound("Whiteboard not found");
    if (existingBoard.createdBy !== userId)
      throw AppError.forbidden("Only the creator can archive this board");

    const updatedBoard = await ctx.db.whiteboard.update({
      where: { id: boardId },
      data: { isArchived: true },
    });

    // Emit notification
    await emit(ctx.db as any, {
      type: "whiteboard.archived",
      payload: {
        whiteboardId: updatedBoard.id,
        whiteboardName: existingBoard.title ?? "Untitled",
        workspaceId: proj?.workspaceId ?? "",
        workspaceSlug: proj?.slug ?? "",
        actorId: ctx.auth?.userId ?? "",
        actorName: "Someone",
        collaboratorIds: [],
      } as any,
      deduplicationId: `whiteboard.archived:${updatedBoard.id}:${Date.now()}`,
    }).catch(() => { /* non-fatal */ });

    return updatedBoard;
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to archive whiteboard");
  }
};
