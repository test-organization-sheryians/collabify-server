import { z } from "zod";
import type { EventDefinition } from "../../types";

export const PayloadSchema = z.object({
  issueId:       z.string(),
  issueTitle:    z.string(),
  issueNumber:   z.number().int(),
  projectId:     z.string(),
  projectName:   z.string(),
  workspaceSlug: z.string(),
  assigneeId:    z.string(),
  actorId:       z.string(),
  actorName:     z.string(),
});
export type Payload = z.infer<typeof PayloadSchema>;

export const definition: EventDefinition = {
  type:          "issue.assigned",
  priority:      "HIGH",
  recipientMode: "single",
  channels:      ["IN_APP", "PUSH", "EMAIL"],
  category:      "assignments",
  payloadSchema: PayloadSchema,
  overrideMute:  true, // direct assignments break through mutes
};
