import { z } from "zod";

export const RemoveRolePermissionSchema = z.object({
  roleId: z.string().cuid(),
  workspaceId: z.string().cuid(), // used for auth scoping
  permissionId: z.string().cuid(),
  actorUserId: z.string().cuid(),
});

export type RemoveRolePermissionInput = z.infer<typeof RemoveRolePermissionSchema>;
