import { z } from "zod";

export const SetConversationNotifModeSchema = z.object({
  userId:         z.string(),
  conversationId: z.string(),
  mode:           z.enum(["ALL_MESSAGES", "MENTIONS_ONLY", "NOTHING"]),
  muteUntil:      z.string().datetime().nullish(),
});

export type SetConversationNotifModeInput = z.infer<typeof SetConversationNotifModeSchema>;
