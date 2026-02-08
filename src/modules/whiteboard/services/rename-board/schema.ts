import { z } from "zod";

export const renameBoardSchema = z.object({
  boardId: z.string().cuid(),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(100, "Title must be less than 100 characters"),
});
