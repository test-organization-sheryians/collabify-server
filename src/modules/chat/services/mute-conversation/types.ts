import { z } from "zod";
import { muteConversationSchema } from "./schema";

export type MuteConversationInput = z.infer<typeof muteConversationSchema>;

export type MuteConversationOutput = {
  success: boolean;
  conversationId: string;
  isMuted: boolean;
};
