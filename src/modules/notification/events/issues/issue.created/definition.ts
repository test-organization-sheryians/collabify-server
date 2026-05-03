import { z } from "zod";
import type { EventDefinition } from "../../types";

export const PayloadSchema = z.object({
  issueId:       z.string(),
  issueTitle:    z.string(),
  issueNumber:   z.number().int(),
  projectId:     z.string(),
  projectName:   z.string(),
  workspaceSlug: z.string(),
  actorId:       z.string(),
  actorName:     z.string(),
  // notify project members/watchers — fan-out
  watcherIds:    z.array(z.string()),
});
export type Payload = z.infer<typeof PayloadSchema>;

export const definition: EventDefinition = {
  type:          "issue.created",
  priority:      "LOW",
  recipientMode: "fan-out",
  channels:      ["IN_APP"],
  category:      "collaboration",
  payloadSchema: PayloadSchema,
  rateLimit: { window: 60_000, max: 10, scope: "per_user", },
};
