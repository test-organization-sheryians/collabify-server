import { z } from "zod";
import type { EventDefinition } from "../../types";

export const PayloadSchema = z.object({
  issueId:       z.string(),
  issueTitle:    z.string(),
  issueNumber:   z.number().int(),
  projectId:     z.string(),
  projectName:   z.string(),
  workspaceSlug: z.string(),
  unassignedUserId: z.string(),
  actorId:       z.string(),
  actorName:     z.string(),
});
export type Payload = z.infer<typeof PayloadSchema>;

export const definition: EventDefinition = {
  type:          "issue.unassigned",
  priority:      "MEDIUM",
  recipientMode: "single",
  channels:      ["IN_APP"],
  category:      "assignments",
  payloadSchema: PayloadSchema,
};
