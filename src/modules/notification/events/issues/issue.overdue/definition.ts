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
  dueDate:       z.string(),
  daysOverdue:   z.number().int(),
});
export type Payload = z.infer<typeof PayloadSchema>;

export const definition: EventDefinition = {
  type:          "issue.overdue",
  priority:      "HIGH",
  recipientMode: "single",
  channels:      ["IN_APP", "EMAIL"],
  category:      "deadlines",
  payloadSchema: PayloadSchema,
  rateLimit: { window: 86_400_000, max: 1, scope: "per_user_per_entity", entityKey: "issueId" },
};
