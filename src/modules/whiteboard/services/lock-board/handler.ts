import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { LockBoardInput } from "./types";

export const handler = async (input: LockBoardInput, ctx: ServiceContext) => {
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
      throw AppError.forbidden("Only the creator can lock this board");
    }

    const updatedBoard = await ctx.db.whiteboard.update({
      where: { id: boardId },
      data: { isLocked: true },
    });

    // TODO: Broadcast 'whiteboard:board-locked' to active users

    return updatedBoard;
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to lock whiteboard");
  }
};
