import { z } from "zod";
import type { EventDefinition } from "../../types";

export const PayloadSchema = z.object({
  workspaceId:    z.string(),
  workspaceName:  z.string(),
  workspaceSlug:  z.string(),
  memberId:       z.string(),
  actorId:        z.string(),
  actorName:      z.string(),
  oldRoleName:    z.string(),
  newRoleName:    z.string(),
});
export type Payload = z.infer<typeof PayloadSchema>;

export const definition: EventDefinition = {
  type:          "workspace.member.role_changed",
  priority:      "HIGH",
  recipientMode: "single",
  channels:      ["EMAIL", "IN_APP"],
  category:      "access_changes",
  payloadSchema: PayloadSchema,
  skipRateLimit: true,
};
