import { z } from "zod";
import type { EventDefinition } from "../../types";

export const PayloadSchema = z.object({
  issueId:       z.string(),
  issueTitle:    z.string(),
  issueNumber:   z.number().int(),
  projectId:     z.string(),
  projectName:   z.string(),
  workspaceSlug: z.string(),
  mentionedUserId: z.string(),
  actorId:       z.string(),
  actorName:     z.string(),
  contextSnippet: z.string().optional(), // surrounding text for context
});
export type Payload = z.infer<typeof PayloadSchema>;

export const definition: EventDefinition = {
  type:          "issue.mention",
  priority:      "HIGH",
  recipientMode: "single",
  channels:      ["IN_APP", "PUSH", "EMAIL"],
  category:      "mentions",
  payloadSchema: PayloadSchema,
  overrideMute:  true,
  rateLimit: { window: 300_000, max: 5, scope: "per_user_per_entity", entityKey: "issueId" },
};
