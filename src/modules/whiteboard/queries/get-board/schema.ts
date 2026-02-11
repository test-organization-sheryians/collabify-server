import { z } from "zod";

export const getBoardSchema = z.object({
  boardId: z.string().cuid(),
});
