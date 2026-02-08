import { z } from "zod";

export const updateBoardDescriptionSchema = z.object({
  boardId: z.string().cuid(),
  description: z
    .string()
    .trim()
    .max(500, "Description must be less than 500 characters")
    .optional(),
});
