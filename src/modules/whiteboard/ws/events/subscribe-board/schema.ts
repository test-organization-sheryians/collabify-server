import { z } from "zod";

export const subscribeBoardSchema = z.object({
  boardId: z.string().min(1),
});

export type SubscribeBoardInput = z.infer<typeof subscribeBoardSchema>;
