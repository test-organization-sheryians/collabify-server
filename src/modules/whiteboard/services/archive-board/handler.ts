import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { ArchiveBoardInput } from "./types";

export const handler = async (
  input: ArchiveBoardInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  const { boardId } = input;

  try {
    const board = await ctx.db.whiteboard.findUnique({
      where: { id: boardId },
      select: {
        createdBy: true,
        isArchived: true,
      },
    });

    if (!board) throw AppError.notFound("Whiteboard not found");

    if (board.isArchived) {
      throw AppError.badRequest("Board is already archived");
    }

    if (board.createdBy !== userId) {
      throw AppError.forbidden("Only the creator can archive this board");
    }

    return await ctx.db.whiteboard.update({
      where: { id: boardId },
      data: { isArchived: true },
    });
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to archive whiteboard");
  }
};
