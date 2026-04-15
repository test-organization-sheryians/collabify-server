import { z } from "zod";
import type { EventDefinition } from "../../types";

export const PayloadSchema = z.object({
  messageId:        z.string(),
  conversationId:   z.string(),
  conversationType: z.enum(["CHANNEL", "GROUP", "DIRECT"]),
  actorId:          z.string(),
  contentPreview:   z.string(),
});
export type Payload = z.infer<typeof PayloadSchema>;

export const definition: EventDefinition = {
  type:          "chat.message.new",
  priority:      "MEDIUM",
  recipientMode: "fan-out",
  channels:      ["IN_APP", "REALTIME"],
  category:      "chat_messages",
  payloadSchema: PayloadSchema,
  rateLimit: { window: 60_000, max: 30, scope: "per_user_per_entity", entityKey: "conversationId" },
};
