import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { UnlockBoardInput } from "./types";

export const handler = async (input: UnlockBoardInput, ctx: ServiceContext) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  const { boardId } = input;

  try {
    const board = await ctx.db.whiteboard.findUnique({
      where: { id: boardId },
      select: { createdBy: true },
    });

    if (!board) throw AppError.notFound("Whiteboard not found");
    if (board.createdBy !== userId) {
      throw AppError.forbidden("Only the creator can unlock this board");
    }

    const updatedBoard = await ctx.db.whiteboard.update({
      where: { id: boardId },
      data: { isLocked: false },
    });

    // TODO: Broadcast 'whiteboard:board-unlocked' to active users

    return updatedBoard;
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to unlock whiteboard");
  }
};
