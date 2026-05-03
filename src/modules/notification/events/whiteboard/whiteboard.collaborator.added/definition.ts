import { z } from "zod";
import type { EventDefinition } from "../../types";
export const PayloadSchema = z.object({ whiteboardId: z.string(), whiteboardName: z.string(), workspaceId: z.string(), workspaceSlug: z.string(), newMemberId: z.string(), actorId: z.string(), actorName: z.string(), accessLevel: z.string() });
export type Payload = z.infer<typeof PayloadSchema>;
export const definition: EventDefinition = { type: "whiteboard.collaborator.added", priority: "MEDIUM", recipientMode: "single", channels: ["IN_APP", "PUSH"], category: "collaboration", payloadSchema: PayloadSchema };
