import { z } from "zod";
import type { EventDefinition } from "../../types";

export const PayloadSchema = z.object({
  workspaceId:   z.string(),
  workspaceName: z.string(),
  workspaceSlug: z.string(),
  planName:      z.string(),
  expiresAt:     z.string(), // ISO date
  daysLeft:      z.number().int(),
  billingUrl:    z.string().url(),
  ownerId:       z.string(),
});

export type Payload = z.infer<typeof PayloadSchema>;

export const definition: EventDefinition = {
  type:          "system.subscription.expiring",
  priority:      "HIGH",
  recipientMode: "single",
  channels:      ["EMAIL", "IN_APP"],
  category:      "system_admin",
  payloadSchema: PayloadSchema,
  rateLimit: {
    window:  86_400_000, // once per day
    max:     1,
    scope:   "per_user_per_entity",
    entityKey: "workspaceId",
  },
};
