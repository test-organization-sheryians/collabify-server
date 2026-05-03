import { z } from "zod";
import type { EventDefinition } from "../../types";
export const PayloadSchema = z.object({
  messageId:        z.string(),
  parentMessageId:  z.string(),
  conversationId:   z.string(),
  actorId:          z.string(),
  contentPreview:   z.string(),
});
export type Payload = z.infer<typeof PayloadSchema>;
export const definition: EventDefinition = {
  type:          "chat.message.reply",
  priority:      "HIGH",
  recipientMode: "single",
  channels:      ["IN_APP", "REALTIME"],
  category:      "chat_messages",
  payloadSchema: PayloadSchema,
  overrideMute:  true,
  rateLimit:     { window: 60_000, max: 5, scope: "per_user_per_entity", entityKey: "parentMessageId" },
};
