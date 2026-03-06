import { z } from "zod";

/**
 * Unified subscription schema for all conversation types
 * Replaces subscribe-channel and subscribe-thread
 */
export const subscribeConversationSchema = z.object({
  conversationId: z.string().min(1),
  conversationType: z.enum(["CHANNEL", "DM", "GROUP_DM", "THREAD"]),
  lastSequence: z.number().optional(),
  epoch: z.string().optional(),
});

export type SubscribeConversationInput = z.infer<
  typeof subscribeConversationSchema
>;
