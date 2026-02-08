import { z } from "zod";

export const unsubscribeBoardSchema = z.object({
  boardId: z.string().min(1),
});

export type UnsubscribeBoardInput = z.infer<typeof unsubscribeBoardSchema>;
