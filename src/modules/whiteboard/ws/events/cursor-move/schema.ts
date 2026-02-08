import { z } from "zod";

export const cursorMoveSchema = z.object({
  boardId: z.string().min(1),
  x: z.number(),
  y: z.number(),
});

export type CursorMoveInput = z.infer<typeof cursorMoveSchema>;
