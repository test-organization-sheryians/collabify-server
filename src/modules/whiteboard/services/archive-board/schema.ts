import { z } from "zod";

export const archiveBoardSchema = z.object({
  boardId: z.string().cuid(),
});
