import { z } from "zod";
import type { EventDefinition } from "../../types";

export const PayloadSchema = z.object({
  workspaceId:   z.string(),
  workspaceName: z.string(),
  inviteId:      z.string(),
  inviteeEmail:  z.string().email(),
  inviteeUserId: z.string().nullable(),
  inviteToken:   z.string(),
  actorId:       z.string(),
  actorName:     z.string(),
  roleName:      z.string(),
});

export type Payload = z.infer<typeof PayloadSchema>;

export const definition: EventDefinition = {
  type:            "workspace.invite.resent",
  priority:        "MEDIUM",
  recipientMode:   "single",
  channels:        ["EMAIL"],
  category:        "access_changes",
  payloadSchema:   PayloadSchema,
  skipPreferences: true,
  rateLimit: { window: 3_600_000, max: 1, scope: "per_user_per_entity", entityKey: "inviteId" },
};
