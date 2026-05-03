import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { Prisma } from "@prisma/client";
import type {
  AddBoardCollaboratorsInput,
  AddBoardCollaboratorsResult,
} from "./types";
import { emit } from "@/modules/notification/outbox/outbox-writer";

/**
 * addBoardCollaborators — Service Handler
 *
 * Auth:
 *   - assertBoardCollaborator — cache-backed; FORBIDDEN if not a collaborator
 *   - permissions.assert("whiteboard:collaborator:add") — RBAC check
 */
export const handler = async (
  input: AddBoardCollaboratorsInput,
  ctx: ServiceContext
): Promise<AddBoardCollaboratorsResult> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const { boardId, userIds } = input;

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
      ctx.permissions.assert("whiteboard:collaborator:add", scope),
    ]);

    // Step 2 — validate all users are workspace members
    const workspaceMembers = await ctx.db.workspaceMember.findMany({
      where: { workspaceId: proj?.workspaceId ?? "", userId: { in: userIds } },
      select: { userId: true },
    });

    const validUserIds = workspaceMembers.map((m) => m.userId);
    if (validUserIds.length !== userIds.length) {
      throw AppError.badRequest(
        "One or more users are not members of this workspace"
      );
    }

    // Step 3 — batch insert collaborators (ignore duplicates)
    let addedCount = 0;
    let skippedCount = 0;

    for (const uid of validUserIds) {
      try {
        await ctx.db.whiteboardCollaborator.create({
          data: { whiteboardId: boardId, userId: uid },
        });
        addedCount++;

        // Emit notification for each collaborator added
        await emit(ctx.db as any, {
          type: "whiteboard.collaborator.added",
          payload: {
            whiteboardId: boardId,
            whiteboardName: (cachedBoard as any).title ?? "Untitled",
            workspaceId: proj?.workspaceId ?? "",
            workspaceSlug: proj?.slug ?? "",
            newMemberId: uid,
            actorId: ctx.auth?.userId ?? "",
            actorName: "Someone",
            accessLevel: "editor",
          } as any,
          deduplicationId: `whiteboard.collaborator.added:${boardId}:${uid}:${Date.now()}`,
        }).catch(() => { /* non-fatal */ });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          skippedCount++;
        } else {
          throw error;
        }
      }
    }

    return { success: true, addedCount, skippedCount };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to add collaborators");
  }
};
