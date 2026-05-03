import { z } from "zod";
import type { EventDefinition } from "../../types";

export const PayloadSchema = z.object({
  workspaceId:   z.string(),
  workspaceName: z.string(),
  workspaceSlug: z.string(),
  inviteeId:     z.string(),
  inviteeName:   z.string(),
  ownerId:       z.string(), // admin who sent the invite — gets notified
  actorName:     z.string(),
});

export type Payload = z.infer<typeof PayloadSchema>;

export const definition: EventDefinition = {
  type:          "workspace.invite.accepted",
  priority:      "MEDIUM",
  recipientMode: "single",
  channels:      ["IN_APP"],
  category:      "access_changes",
  payloadSchema: PayloadSchema,
};
