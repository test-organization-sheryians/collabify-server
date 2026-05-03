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
  // Mutation delta cursor: ISO timestamp of the client's last connected session.
  // When provided, the server sends chat:message-deleted / chat:message-edited
  // events for all mutations that happened since this time (offline gap sync).
  lastOpenedAt: z.string().datetime().optional(),
});

export type SubscribeConversationInput = z.infer<
  typeof subscribeConversationSchema
>;
