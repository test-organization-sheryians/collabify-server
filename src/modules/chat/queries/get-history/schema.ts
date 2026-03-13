import { z } from "zod";

export const getHistorySchema = z.object({
  conversationId: z.string().cuid(),
  beforeSequence: z.number().int(),
  limit: z.number().int().min(1).max(100).default(50).optional(),
});

export type GetHistoryInput = z.infer<typeof getHistorySchema>;
