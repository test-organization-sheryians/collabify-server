import { z } from "zod";

export const UpdateProjectRoleSchema = z.object({
  roleId: z.string().cuid(),
  projectId: z.string().cuid(),
  workspaceId: z.string().cuid(),
  actorUserId: z.string().min(1),
  name: z.string().min(1).max(50).trim().optional(),
  description: z.string().max(200).trim().optional(),
  rank: z.number().int().min(1).max(99).optional(),
});

export type UpdateProjectRoleInput = z.infer<typeof UpdateProjectRoleSchema>;
