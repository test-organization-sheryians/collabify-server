import { z } from "zod";

export const getDmByUsersSchema = z.object({
  workspaceId: z.string().cuid(),
  projectId: z.string().cuid(),
  otherUserId: z.string().min(1),
});

/**
 * Find an existing DM conversation between two users in a project.
 * Used for "start conversation" flows to avoid duplicates.
 */
export type GetDmByUsersInput = z.infer<typeof getDmByUsersSchema>;
