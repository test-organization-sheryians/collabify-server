import { z } from "zod";
import type { EventDefinition } from "../../types";
export const PayloadSchema = z.object({
  threadId:         z.string(),
  conversationId:   z.string(),
  conversationName: z.string().nullable(),
  workspaceId:      z.string(),
  workspaceSlug:    z.string(),
  actorId:          z.string(),
  actorName:        z.string(),
  contentPreview:   z.string(),
  recipientIds:     z.array(z.string()),
});
export type Payload = z.infer<typeof PayloadSchema>;
export const definition: EventDefinition = {
  type:          "chat.thread.created",
  priority:      "MEDIUM",
  recipientMode: "fan-out",
  channels:      ["IN_APP", "REALTIME"],
  category:      "chat_messages",
  payloadSchema: PayloadSchema,
  rateLimit:     { window: 60_000, max: 10, scope: "per_user_per_entity", entityKey: "conversationId" },
};
