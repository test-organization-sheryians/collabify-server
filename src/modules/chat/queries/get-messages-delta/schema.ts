import { z } from "zod";

export const getMessagesDeltaSchema = z.object({
  conversationId: z.string().cuid(),
  afterSequence: z.number().int().min(0).optional(),
  afterStreamId: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional().default(50),
});

export type GetMessagesDeltaInput = z.infer<typeof getMessagesDeltaSchema>;
