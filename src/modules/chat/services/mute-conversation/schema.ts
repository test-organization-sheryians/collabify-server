import { z } from "zod";

/**
 * Mute Conversation Schema
 *
 * Universal service - works for CHANNEL, DM, GROUP, and THREAD
 */
export const muteConversationSchema = z.object({
  conversationId: z.string().cuid(),
  isMuted: z.boolean(),
});
