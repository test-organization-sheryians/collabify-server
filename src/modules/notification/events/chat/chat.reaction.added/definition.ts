import { z } from "zod";
import type { EventDefinition } from "../../types";
export const PayloadSchema = z.object({ messageId: z.string(), conversationId: z.string(), conversationName: z.string().nullable(), workspaceId: z.string(), workspaceSlug: z.string(), messageAuthorId: z.string(), actorId: z.string(), actorName: z.string(), emoji: z.string() });
export type Payload = z.infer<typeof PayloadSchema>;
export const definition: EventDefinition = {
  type:          "chat.reaction.added",
  priority:      "LOW",
  recipientMode: "single",
  channels:      ["IN_APP", "REALTIME"],
  category:      "reactions",
  payloadSchema: PayloadSchema,
  batching:      { window: 120_000, groupBy: "messageId", maxSize: 20 }, // batch reactions — "5 people reacted 🎉"
  rateLimit:     { window: 60_000, max: 10, scope: "per_user_per_entity", entityKey: "messageId" },
};
