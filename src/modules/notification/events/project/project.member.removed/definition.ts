import { z } from "zod";
import type { EventDefinition } from "../../types";

export const PayloadSchema = z.object({
  projectId:     z.string(),
  projectName:   z.string(),
  workspaceId:   z.string(),
  workspaceSlug: z.string(),
  removedUserId: z.string(),
  actorId:       z.string(),
  actorName:     z.string(),
});
export type Payload = z.infer<typeof PayloadSchema>;

export const definition: EventDefinition = {
  type:            "project.member.removed",
  priority:        "HIGH",
  recipientMode:   "single",
  channels:        ["IN_APP"],
  category:        "access_changes",
  payloadSchema:   PayloadSchema,
  skipPreferences: true,
};
