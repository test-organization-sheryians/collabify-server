import { z } from "zod";

export const unlockBoardSchema = z.object({
  boardId: z.string().cuid(),
});
