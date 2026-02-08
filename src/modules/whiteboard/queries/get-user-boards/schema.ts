import { z } from "zod";

export const getUserBoardsSchema = z.object({
  workspaceId: z.string().cuid(),
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().cuid().optional(),
});
