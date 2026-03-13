import { z } from "zod";

/**
 * Fetch a single conversation by ID with full details and metadata.
 * conversationId must be a CUID — validated before handler execution.
 */
export const getConversationSchema = z.object({
  conversationId: z.string().cuid(),
});

export type GetConversationInput = z.infer<typeof getConversationSchema>;
