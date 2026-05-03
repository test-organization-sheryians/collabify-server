import { z } from "zod";
import type { EventDefinition } from "../../types";

export const PayloadSchema = z.object({
  workspaceId:   z.string(),
  workspaceName: z.string(),
  workspaceSlug: z.string(),
  limitType:     z.enum(["members", "storage", "projects", "api_calls"]),
  currentUsage:  z.number(),
  limit:         z.number(),
  usagePct:      z.number(), // 0-100
  ownerId:       z.string(),
  upgradeUrl:    z.string().url(),
});

export type Payload = z.infer<typeof PayloadSchema>;

export const definition: EventDefinition = {
  type:          "system.plan.limit",
  priority:      "HIGH",
  recipientMode: "single",
  channels:      ["EMAIL", "IN_APP"],
  category:      "system_admin",
  payloadSchema: PayloadSchema,
  rateLimit: {
    window:    3_600_000, // once per hour per limit type
    max:       1,
    scope:     "per_user_per_entity",
    entityKey: "limitType",
  },
};
