import { z } from "zod";

export const CreateProjectRoleSchema = z.object({
  projectId: z.string().cuid(),
  workspaceId: z.string().cuid(),
  name: z.string().min(1).max(50).trim(),
  description: z.string().max(200).trim().optional(),
  rank: z.number().int().min(1).max(99),
  actorUserId: z.string().min(1),
});

export type CreateProjectRoleInput = z.infer<typeof CreateProjectRoleSchema>;
