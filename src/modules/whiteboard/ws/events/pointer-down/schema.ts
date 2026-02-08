import { z } from "zod";

export const pointerDownSchema = z.object({
  boardId: z.string().min(1),
});

export type PointerDownInput = z.infer<typeof pointerDownSchema>;
