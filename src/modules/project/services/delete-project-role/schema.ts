import { z } from "zod";

export const DeleteProjectRoleSchema = z.object({
  roleId: z.string().cuid(),
  projectId: z.string().cuid(),
  workspaceId: z.string().cuid(),
  actorUserId: z.string().min(1),
});

export type DeleteProjectRoleInput = z.infer<typeof DeleteProjectRoleSchema>;
