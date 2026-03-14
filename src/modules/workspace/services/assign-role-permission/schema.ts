import { z } from "zod";

export const AssignRolePermissionSchema = z.object({
  roleId: z.string().cuid(),
  workspaceId: z.string().cuid(), // used for auth scoping
  permissionId: z.string().cuid(),
  effect: z.enum(["ALLOW", "DENY"]).default("ALLOW"),
  conditions: z.string().optional(), // JSON string — parsed in the step
  actorUserId: z.string().cuid(),
});

export type AssignRolePermissionInput = z.infer<typeof AssignRolePermissionSchema>;
