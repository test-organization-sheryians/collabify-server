import { z } from "zod";

/**
 * Get Conversation Schema
 *
 * Fetch a single conversation by ID with full details and metadata.
 */
export const getConversationSchema = z.object({
  conversationId: z.string().cuid(),
});
