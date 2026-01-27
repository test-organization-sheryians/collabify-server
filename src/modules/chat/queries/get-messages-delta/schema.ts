import { z } from "zod";

export const getMessagesDeltaSchema = z.object({
  conversationId: z.string().cuid(),
  afterStreamId: z.string(), // We don't enforce ULID/format here, just string logic
  limit: z.number().int().min(1).max(200).optional().default(50),
});
