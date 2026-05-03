import { z } from "zod";
import type { EventDefinition } from "../../types";
export const PayloadSchema = z.object({
  messageId:        z.string(),
  conversationId:   z.string(),
  mentionedUserId:   z.string(),
  actorId:           z.string(),
  contentPreview:    z.string(),
});
export type Payload = z.infer<typeof PayloadSchema>;
export const definition: EventDefinition = {
  type:          "chat.message.mention",
  priority:      "HIGH",
  recipientMode: "single",
  channels:      ["IN_APP", "REALTIME"],
  category:      "mentions",
  payloadSchema: PayloadSchema,
  overrideMute:  true,
  rateLimit:     { window: 300_000, max: 5, scope: "per_user_per_entity", entityKey: "conversationId" },
};
