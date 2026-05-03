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

export const UpdateWorkspaceNotifPrefsSchema = z.object({
  userId:       z.string(),
  workspaceId:  z.string(),
  emailEnabled: z.boolean().optional().nullable(),
  pushEnabled:  z.boolean().optional().nullable(),
  categories:   z.array(CategoryInputSchema).optional(),
});

export type UpdateWorkspaceNotifPrefsInput = z.infer<typeof UpdateWorkspaceNotifPrefsSchema>;
