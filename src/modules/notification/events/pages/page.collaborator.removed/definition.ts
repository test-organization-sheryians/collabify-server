import { z } from "zod";
import type { EventDefinition } from "../../types";
export const PayloadSchema = z.object({ pageId: z.string(), pageTitle: z.string(), workspaceId: z.string(), workspaceSlug: z.string(), removedUserId: z.string(), actorId: z.string(), actorName: z.string() });
export type Payload = z.infer<typeof PayloadSchema>;
export const definition: EventDefinition = { type: "page.collaborator.removed", priority: "MEDIUM", recipientMode: "single", channels: ["IN_APP"], category: "collaboration", payloadSchema: PayloadSchema };
