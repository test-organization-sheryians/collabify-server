import { z } from "zod";

export const pointerUpSchema = z.object({
  boardId: z.string().min(1),
});

export type PointerUpInput = z.infer<typeof pointerUpSchema>;
