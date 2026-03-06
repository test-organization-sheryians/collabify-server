import { z } from "zod";

export const UpdateProjectMemberRoleSchema = z.object({
  projectId: z.string(),
  workspaceId: z.string(),
  actorUserId: z.string(),
  targetUserId: z.string(),
  roleId: z.string(),
});

export type UpdateProjectMemberRoleInput = z.infer<
  typeof UpdateProjectMemberRoleSchema
>;
