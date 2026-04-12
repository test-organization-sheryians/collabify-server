import { z } from "zod";
import type { EventDefinition } from "../../types";

export const PayloadSchema = z.object({
  issueId:       z.string(),
  issueTitle:    z.string(),
  issueNumber:   z.number().int(),
  projectId:     z.string(),
  projectName:   z.string(),
  workspaceSlug: z.string(),
  assigneeId:    z.string().nullable(), // current assignee (may be null)
  actorId:       z.string(),
  actorName:     z.string(),
  oldStatus:     z.string(),
  newStatus:     z.string(),
});
export type Payload = z.infer<typeof PayloadSchema>;

export const definition: EventDefinition = {
  type:          "issue.status.changed",
  priority:      "MEDIUM",
  recipientMode: "single",
  channels:      ["IN_APP"],
  category:      "assignments",
  payloadSchema: PayloadSchema,
  rateLimit: { window: 60_000, max: 3, scope: "per_user_per_entity", entityKey: "issueId" },
};
