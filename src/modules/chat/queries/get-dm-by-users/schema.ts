import { z } from "zod";

/**
 * Get DM By Users Schema
 *
 * Find an existing DM conversation between two users in a project.
 * Used for "start conversation" flows to avoid duplicates.
 */
export const getDmByUsersSchema = z.object({
  workspaceId: z.string().cuid(),
  projectId: z.string().cuid(),
  otherUserId: z.string().cuid(), // The other participant (current user is from ctx)
});
