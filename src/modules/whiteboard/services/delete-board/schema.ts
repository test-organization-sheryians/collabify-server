import { z } from "zod";

export const deleteBoardSchema = z.object({
  boardId: z.string().cuid(),
});
