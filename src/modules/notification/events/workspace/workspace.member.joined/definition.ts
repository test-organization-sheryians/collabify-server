import { z } from "zod";
import type { EventDefinition } from "../../types";

export const PayloadSchema = z.object({
  workspaceId:   z.string(),
  workspaceName: z.string(),
  workspaceSlug: z.string(),
  newMemberId:   z.string(),
  newMemberName: z.string(),
  actorId:       z.string(),
  actorName:     z.string(),
  roleName:      z.string(),
  // fan-out: notify existing admins/owners
  adminIds:      z.array(z.string()),
});
export type Payload = z.infer<typeof PayloadSchema>;

export const definition: EventDefinition = {
  type:          "workspace.member.joined",
  priority:      "LOW",
  recipientMode: "fan-out", // notify workspace admins
  channels:      ["IN_APP"],
  category:      "access_changes",
  payloadSchema: PayloadSchema,
};
