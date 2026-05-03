import { z } from "zod";
import type { EventDefinition } from "../../types";

export const PayloadSchema = z.object({
  userId:    z.string(),
  userName:  z.string(),
  userEmail: z.string().email(),
});

export type Payload = z.infer<typeof PayloadSchema>;

export const definition: EventDefinition = {
  type:            "user.welcome",
  priority:        "HIGH",
  recipientMode:   "single",
  channels:        ["EMAIL", "IN_APP"],
  category:        "system_admin",
  payloadSchema:   PayloadSchema,
  skipRateLimit:   true,
  skipPreferences: true, // critical onboarding — always fires
};
