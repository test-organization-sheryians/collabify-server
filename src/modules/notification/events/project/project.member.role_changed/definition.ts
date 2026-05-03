import { z } from "zod";
import type { EventDefinition } from "../../types";

export const PayloadSchema = z.object({
  projectId:     z.string(),
  projectName:   z.string(),
  workspaceId:   z.string(),
  workspaceSlug: z.string(),
  memberId:      z.string(),
  actorId:       z.string(),
  actorName:     z.string(),
  oldRoleName:   z.string(),
  newRoleName:   z.string(),
});
export type Payload = z.infer<typeof PayloadSchema>;

export const definition: EventDefinition = {
  type:          "project.member.role_changed",
  priority:      "MEDIUM",
  recipientMode: "single",
  channels:      ["IN_APP"],
  category:      "access_changes",
  payloadSchema: PayloadSchema,
};
