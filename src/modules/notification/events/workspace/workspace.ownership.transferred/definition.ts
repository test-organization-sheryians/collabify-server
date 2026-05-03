import { z } from "zod";
import type { EventDefinition } from "../../types";

export const PayloadSchema = z.object({
  workspaceId:      z.string(),
  workspaceName:    z.string(),
  workspaceSlug:    z.string(),
  previousOwnerId:  z.string(),
  newOwnerId:       z.string(),
  actorId:          z.string(),
  actorName:        z.string(),
});
export type Payload = z.infer<typeof PayloadSchema>;

export const definition: EventDefinition = {
  type:            "workspace.ownership.transferred",
  priority:        "CRITICAL",
  recipientMode:   "fan-out", // both old and new owner notified
  channels:        ["EMAIL", "IN_APP"],
  category:        "access_changes",
  payloadSchema:   PayloadSchema,
  skipRateLimit:   true,
  skipPreferences: true,
};
