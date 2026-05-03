import { z } from "zod";

const CategoryInputSchema = z.object({
  category: z.enum([
    "chat_messages", "mentions", "reactions", "assignments",
    "deadlines", "access_changes", "collaboration", "system_admin",
  ]),
  email: z.boolean(),
  push:  z.boolean(),
  inApp: z.boolean(),
});

export const UpdateGlobalNotifPrefsSchema = z.object({
  userId:       z.string(),
  emailEnabled: z.boolean().optional(),
  pushEnabled:  z.boolean().optional(),
  globalMode:   z.enum(["ALL", "MENTIONS_ONLY", "NOTHING"]).optional(),
  muteUntil:    z.string().datetime().nullish(),
  categories:   z.array(CategoryInputSchema).optional(),
});

export type UpdateGlobalNotifPrefsInput = z.infer<typeof UpdateGlobalNotifPrefsSchema>;
