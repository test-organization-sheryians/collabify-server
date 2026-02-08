import { z } from "zod";

export const getWorkspaceBoardsSchema = z.object({
  workspaceId: z.string().cuid(),
  includeArchived: z.boolean().default(false),
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().cuid().optional(),
});
