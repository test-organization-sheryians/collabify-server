import { z } from "zod";

export const GetHistoryInputSchema = z.object({
  conversationId: z.string().min(1),
  beforeSequence: z.number().int(),
  limit: z.number().int().min(1).max(100).default(50).optional(),
});
