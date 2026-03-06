import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { Prisma } from "@prisma/client";
import type {
  AddBoardCollaboratorsInput,
  AddBoardCollaboratorsResult,
} from "./types";

/**
 * Add Board Collaborators Handler
 *
 * Grants users access to a whiteboard.
 * Only workspace members can be added.
 */
export const handler = async (
  input: AddBoardCollaboratorsInput,
  ctx: ServiceContext
): Promise<AddBoardCollaboratorsResult> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  const { boardId, userIds } = input;

  try {
    // 1. Get board and verify requester has access
    const board = await ctx.db.whiteboard.findUnique({
      where: { id: boardId },
      select: {
        id: true,
        workspaceId: true,
        createdBy: true,
      },
    });

    if (!board) {
      throw AppError.notFound("Whiteboard not found");
    }

    // Check requester is creator or collaborator
    const hasAccess =
      board.createdBy === userId ||
      (await ctx.db.whiteboardCollaborator.findFirst({
        where: { whiteboardId: boardId, userId },
      }));

    if (!hasAccess) {
      throw AppError.forbidden("You do not have access to this whiteboard");
    }

    // 2. Validate all users are workspace members
    const workspaceMembers = await ctx.db.workspaceMember.findMany({
      where: {
        workspaceId: board.workspaceId,
        userId: { in: userIds },
      },
      select: { userId: true },
    });

    const validUserIds = workspaceMembers.map((m) => m.userId);

    if (validUserIds.length !== userIds.length) {
      throw AppError.badRequest(
        "One or more users are not members of this workspace"
      );
    }

    // 3. Batch insert collaborators (ignore duplicates)
    let addedCount = 0;
    let skippedCount = 0;

    for (const uid of validUserIds) {
      try {
        await ctx.db.whiteboardCollaborator.create({
          data: {
            whiteboardId: boardId,
            userId: uid,
          },
        });
        addedCount++;
      } catch (error) {
        // If unique constraint violation, skip
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

    return {
      success: true,
      addedCount,
      skippedCount,
    };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to add collaborators");
  }
};
