import { z } from "zod";
import type { EventDefinition } from "../../types";
export const PayloadSchema = z.object({ conversationId: z.string(), workspaceId: z.string(), workspaceSlug: z.string(), recipientId: z.string(), actorId: z.string(), actorName: z.string(), firstMessagePreview: z.string() });
export type Payload = z.infer<typeof PayloadSchema>;
export const definition: EventDefinition = { type: "chat.dm.created", priority: "HIGH", recipientMode: "single", channels: ["IN_APP", "PUSH", "REALTIME"], category: "chat_messages", payloadSchema: PayloadSchema, overrideMute: true };
