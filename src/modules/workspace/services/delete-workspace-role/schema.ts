import { z } from "zod";

export const DeleteWorkspaceRoleSchema = z.object({
  roleId: z.string().cuid(),
  workspaceId: z.string().cuid(),
  actorUserId: z.string().cuid(),
});

export type DeleteWorkspaceRoleInput = z.infer<typeof DeleteWorkspaceRoleSchema>;
