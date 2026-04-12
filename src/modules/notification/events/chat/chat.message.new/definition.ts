import { z } from "zod";
import type { EventDefinition } from "../../types";

export const PayloadSchema = z.object({
  messageId:      z.string(),
  conversationId: z.string(),
  conversationType: z.enum(["CHANNEL", "GROUP", "DIRECT"]),
  conversationName: z.string().nullable(), // null for DMs
  workspaceId:    z.string(),
  workspaceSlug:  z.string(),
  actorId:        z.string(),
  actorName:      z.string(),
  contentPreview: z.string(), // truncated message text (max 200 chars)
  // fan-out: all conversation members except sender
  recipientIds:   z.array(z.string()),
});
export type Payload = z.infer<typeof PayloadSchema>;

export const definition: EventDefinition = {
  type:          "chat.message.new",
  priority:      "MEDIUM",
  recipientMode: "fan-out",
  channels:      ["IN_APP", "PUSH", "REALTIME"],
  category:      "chat_messages",
  payloadSchema: PayloadSchema,
  // Batch messages per conversation — 5 min window, flush every 10 messages
  batching: { window: 300_000, groupBy: "conversationId", maxSize: 10 },
  rateLimit: { window: 60_000, max: 30, scope: "per_user_per_entity", entityKey: "conversationId" },
};
