import { z } from "zod";

export const createGroupInputSchema = z.object({
  workspaceId: z.string().min(1),
  projectId: z.string().min(1),
  name: z
    .string()
    .trim()
    .min(1, "Group name is required")
    .max(100, "Group name must be less than 100 characters")
    .regex(
      /^[a-zA-Z0-9\s\-_]+$/,
      "Group name can only contain letters, numbers, spaces, hyphens, and underscores"
    ),
  memberUserIds: z.array(z.string()).min(1).max(50),
});

export type CreateGroupInput = z.infer<typeof createGroupInputSchema>;
