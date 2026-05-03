import { z } from "zod";
import type { EventDefinition } from "../../types";

export const PayloadSchema = z.object({
  projectId:     z.string(),
  projectName:   z.string(),
  workspaceId:   z.string(),
  workspaceSlug: z.string(),
  actorId:       z.string(),
  actorName:     z.string(),
  memberIds:     z.array(z.string()),
});
export type Payload = z.infer<typeof PayloadSchema>;

export const definition: EventDefinition = {
  type:          "project.unarchived",
  priority:      "LOW",
  recipientMode: "fan-out",
  channels:      ["IN_APP"],
  category:      "collaboration",
  payloadSchema: PayloadSchema,
};
