import { z } from "zod";

/**
 * Get User Conversations Schema
 *
 * Unified query for fetching all conversation types (CHANNEL, DM, GROUP, THREAD)
 * Supports filtering, pagination, and archived conversations.
 */
export const getUserConversationsSchema = z.object({
  workspaceId: z.string().cuid(),
  projectId: z.string().cuid(),
  type: z.enum(["CHANNEL", "DM", "GROUP", "THREAD"]).optional(),
  includeArchived: z.boolean().optional().default(false),
  limit: z.number().min(1).max(100).optional().default(50),
  cursor: z.string().optional(), // ISO date string for cursor-based pagination
});
