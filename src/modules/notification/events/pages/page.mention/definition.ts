import { z } from "zod";
import type { EventDefinition } from "../../types";
export const PayloadSchema = z.object({ pageId: z.string(), pageTitle: z.string(), workspaceId: z.string(), workspaceSlug: z.string(), mentionedUserId: z.string(), actorId: z.string(), actorName: z.string(), contextSnippet: z.string().optional() });
export type Payload = z.infer<typeof PayloadSchema>;
export const definition: EventDefinition = { type: "page.mention", priority: "HIGH", recipientMode: "single", channels: ["IN_APP", "PUSH"], category: "mentions", payloadSchema: PayloadSchema, overrideMute: true, rateLimit: { window: 300_000, max: 3, scope: "per_user_per_entity", entityKey: "pageId" } };
