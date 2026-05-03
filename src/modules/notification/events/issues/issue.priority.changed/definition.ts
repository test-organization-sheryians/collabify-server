import { z } from "zod";
import type { EventDefinition } from "../../types";

export const PayloadSchema = z.object({
  issueId:       z.string(),
  issueTitle:    z.string(),
  issueNumber:   z.number().int(),
  projectId:     z.string(),
  projectName:   z.string(),
  workspaceSlug: z.string(),
  assigneeId:    z.string().nullable(),
  actorId:       z.string(),
  actorName:     z.string(),
  oldPriority:   z.string(),
  newPriority:   z.string(),
});
export type Payload = z.infer<typeof PayloadSchema>;

export const definition: EventDefinition = {
  type:          "issue.priority.changed",
  priority:      "LOW",
  recipientMode: "single",
  channels:      ["IN_APP"],
  category:      "assignments",
  payloadSchema: PayloadSchema,
  rateLimit: { window: 300_000, max: 2, scope: "per_user_per_entity", entityKey: "issueId" },
};
