import { z } from "zod";

/**
 * Get User Conversations Schema
 *
 * Fetches conversational items: CHANNEL, DM, GROUP_DM
 * Note: THREAD is excluded - threads are contextual to messages, not top-level conversations
 */
export const getUserConversationsSchema = z.object({
  workspaceId: z.string().cuid(),
  projectId: z.string().cuid(),
  type: z.enum(["CHANNEL", "DM", "GROUP_DM"]).optional(),
  includeArchived: z.boolean().optional(),
  limit: z.number().min(1).max(100).optional(),
  cursor: z.string().optional(), // ISO date string for cursor-based pagination
});
