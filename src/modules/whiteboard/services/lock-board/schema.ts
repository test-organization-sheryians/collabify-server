import { z } from "zod";

export const lockBoardSchema = z.object({
  boardId: z.string().cuid(),
});
