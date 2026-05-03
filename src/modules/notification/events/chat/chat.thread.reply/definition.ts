import { z } from "zod";
import type { EventDefinition } from "../../types";
export const PayloadSchema = z.object({
  messageId:        z.string(),
  threadId:         z.string(),
  conversationId:   z.string(),
  conversationName: z.string().nullable(),
  workspaceId:      z.string(),
  workspaceSlug:    z.string(),
  actorId:          z.string(),
  actorName:        z.string(),
  contentPreview:   z.string(),
  threadParticipantIds: z.array(z.string()),
});
export type Payload = z.infer<typeof PayloadSchema>;
export const definition: EventDefinition = {
  type:          "chat.thread.reply",
  priority:      "MEDIUM",
  recipientMode: "fan-out",
  channels:      ["IN_APP", "PUSH", "REALTIME"],
  category:      "chat_messages",
  payloadSchema: PayloadSchema,
  batching:      { window: 180_000, groupBy: "threadId", maxSize: 5 },
  rateLimit:     { window: 60_000, max: 10, scope: "per_user_per_entity", entityKey: "threadId" },
};
