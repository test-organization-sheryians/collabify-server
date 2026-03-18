/**
 * assignRolePermission — Service Handler (thin orchestrator)
 *
 * Assigns (or updates) a permission grant/deny on a role.
 * Works for both workspace roles and project roles — roleId identifies the role.
 *
 * Auth:
 *   - assertWorkspaceAdminOrAbove
 *   - permissions.assert("workspace.role:assign-permission")
 * Steps:
 *   1. [auth] parallel
 *   2. upsertRolePermission — validate ownership, upsert RolePermission row
 * Cache Invalidation:
 *   - invalidator.permissions.invalidateByRole(roleId) — clears roleperms:{roleId}
 *     and bulk-DEL perm:* for all users holding this role via role-members index
 */
import { AppError } from "@/shared/errors";
import type { AssignRolePermissionInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { upsertRolePermission } from "./steps/upsert-role-permission";

export const assignRolePermission = async (
  input: AssignRolePermissionInput,
  ctx: ServiceContext
) => {
  const { roleId, workspaceId, permissionId, effect, conditions } = input;
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();
  const scope = { type: "workspace" as const, id: workspaceId };
  await Promise.all([
    ctx.authGate.assertWorkspaceAdminOrAbove(workspaceId),
    ctx.permissions.assert("workspace.role:assign-permission", scope),
  ]);

  const result = await upsertRolePermission(
    roleId,
    workspaceId,
    permissionId,
    effect,
    conditions,
    ctx.db
  );

  // Invalidate cached role permission set + all members holding this role
  const roleMembers = await ctx.db.workspaceMember.findMany({
    where: { roleId },
    select: { userId: true },
  });
  await ctx.permissions.invalidate.invalidateRole(
    roleId,
    roleMembers.map((m) => m.userId)
  );

  return {
    ...result,
    conditions: result.conditions != null ? JSON.stringify(result.conditions) : null,
  };
};
