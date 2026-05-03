import { z } from "zod";
import type { EventDefinition } from "../../types";

export const PayloadSchema = z.object({
  projectId:     z.string(),
  projectName:   z.string(),
  workspaceId:   z.string(),
  workspaceSlug: z.string(),
  newMemberId:   z.string(),
  actorId:       z.string(),
  actorName:     z.string(),
  roleName:      z.string(),
});
export type Payload = z.infer<typeof PayloadSchema>;

export const definition: EventDefinition = {
  type:          "project.member.added",
  priority:      "MEDIUM",
  recipientMode: "single",
  channels:      ["IN_APP", "PUSH"],
  category:      "access_changes",
  payloadSchema: PayloadSchema,
};
