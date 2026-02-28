import { z } from "zod";

export const subscribeBoardSchema = z.object({
  boardId: z.string().min(1),
  lastStreamId: z.string().optional(), // ✅ NEW: For replay gap handling
});

export type SubscribeBoardInput = z.infer<typeof subscribeBoardSchema>;
