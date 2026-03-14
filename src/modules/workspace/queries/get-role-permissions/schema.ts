import { z } from "zod";

export const GetRolePermissionsSchema = z.object({
  roleId: z.string().cuid(),
  workspaceId: z.string().cuid(), // used for workspace membership auth check
  actorUserId: z.string().cuid(),
});

export type GetRolePermissionsInput = z.infer<typeof GetRolePermissionsSchema>;
