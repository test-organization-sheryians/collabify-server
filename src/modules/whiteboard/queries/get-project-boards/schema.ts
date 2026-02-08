import { z } from "zod";

export const getProjectBoardsSchema = z.object({
  projectId: z.string().cuid(),
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().cuid().optional(),
});
