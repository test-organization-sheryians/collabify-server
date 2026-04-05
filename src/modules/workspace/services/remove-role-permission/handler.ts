/**
 * removeRolePermission — Service Handler (thin orchestrator)
 *
 * Removes a permission assignment from a role.
 * Works for both workspace roles and project roles — roleId identifies the role.
 *
 * Auth:
 *   - permissions.assert("workspace:role:assign-permission") — ADMIN+ only (RBAC)
 * Steps:
 *   1. [auth] assert("workspace:role:assign-permission")
 *   2. [pre-delete] invalidate role cache (must be done before row is gone)
 *   3. deleteRolePermission — validate ownership, then delete RolePermission row
 */
import { AppError } from "@/shared/errors";
import type { RemoveRolePermissionInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { deleteRolePermission } from "./steps/delete-role-permission";

export const removeRolePermission = async (
  input: RemoveRolePermissionInput,
  ctx: ServiceContext
) => {
  const { roleId, workspaceId, permissionId } = input;
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();
  const scope = { type: "workspace" as const, id: workspaceId };
  await ctx.permissions.assert("workspace:role:assign-permission", scope);

  // Guard: system roles are immutable — their permissions cannot be removed
  const role = await ctx.db.role.findUnique({
    where: { id: roleId },
    select: { isSystem: true },
  });
  if (role?.isSystem) {
    throw AppError.forbidden("Cannot remove permissions from a system role");
  }

  // Invalidate cached role permission set + all members holding this role
  // Must be done BEFORE deletion so we can still fetch members by roleId
  const roleMembers = await ctx.db.workspaceMember.findMany({
    where: { roleId },
    select: { userId: true },
  });
  await ctx.permissions.invalidate.invalidateRole(
    roleId,
    roleMembers.map((m) => m.userId)
  );

  return deleteRolePermission(roleId, workspaceId, permissionId, ctx.db);
};
