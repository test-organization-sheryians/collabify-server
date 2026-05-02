import { z } from "zod";

export const getPagesHomeSchema = z.object({
  workspaceId: z.string().cuid(),
  projectId: z.string().cuid(),
  limit: z.number().min(1).max(20).default(10),
});

export type GetPagesHomeInput = z.infer<typeof getPagesHomeSchema>;
