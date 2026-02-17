import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { UnarchiveBoardInput } from "./types";

export const handler = async (
  input: UnarchiveBoardInput,
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

    if (!board.isArchived) {
      throw AppError.badRequest("Board is not archived");
    }

    if (board.createdBy !== userId) {
      throw AppError.forbidden("Only the creator can unarchive this board");
    }

    return await ctx.db.whiteboard.update({
      where: { id: boardId },
      data: { isArchived: false },
    });
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to unarchive whiteboard");
  }
};
