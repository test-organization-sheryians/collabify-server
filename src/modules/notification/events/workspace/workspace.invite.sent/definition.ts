import { z } from "zod";
import type { EventDefinition } from "../../types";

export const PayloadSchema = z.object({
  workspaceId:    z.string(),
  workspaceName:  z.string(),
  workspaceSlug:  z.string(),
  inviteToken:    z.string(),
  inviteId:       z.string(),
  inviteeEmail:   z.string().email(),
  inviteeUserId:  z.string().nullable(), // null if not yet registered
  actorId:        z.string(),
  actorName:      z.string(),
  roleName:       z.string(),
});

export type Payload = z.infer<typeof PayloadSchema>;

export const definition: EventDefinition = {
  type:            "workspace.invite.sent",
  priority:        "HIGH",
  recipientMode:   "single",
  channels:        ["EMAIL", "IN_APP"],
  category:        "access_changes",
  payloadSchema:   PayloadSchema,
  skipPreferences: true, // always send invites — user hasn't opted in yet
};
