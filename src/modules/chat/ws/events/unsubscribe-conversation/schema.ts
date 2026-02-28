import { z } from "zod";

/**
 * Unified unsubscription schema for all conversation types
 * Replaces unsubscribe-channel and unsubscribe-thread
 */
export const unsubscribeConversationSchema = z.object({
  conversationId: z.string().min(1),
});

export type UnsubscribeConversationInput = z.infer<
  typeof unsubscribeConversationSchema
>;
