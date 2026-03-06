import { z } from "zod";

export const getMessagesDeltaSchema = z.object({
  conversationId: z.string().cuid(),
  afterSequence: z.number().int().min(0).optional(), // Primary Cursor (New)
  afterStreamId: z.string().optional(), // Fallback / Legacy Cursor
  limit: z.number().int().min(1).max(200).optional().default(50),
});
