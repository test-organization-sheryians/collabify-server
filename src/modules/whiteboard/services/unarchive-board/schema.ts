import { z } from "zod";

export const unarchiveBoardSchema = z.object({
  boardId: z.string().cuid(),
});
