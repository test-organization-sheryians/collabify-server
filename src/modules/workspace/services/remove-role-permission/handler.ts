/**
 * removeRolePermission — Service Handler (thin orchestrator)
 *
 * Removes a permission assignment from a role.
 * Works for both workspace roles and project roles — roleId identifies the role.
 *
 * Auth (scope-aware):
 *   - Project role → assert("project:role:assign-permission", ProjectScope)
 *   - Workspace role → assert("workspace:role:assign-permission", WorkspaceScope)
 * Steps:
 *   1. [auth] scope-aware assert
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

  // Step 1: Determine role scope (project vs workspace)
  const roleContext = await ctx.db.role.findUnique({
    where: { id: roleId },
    select: { isSystem: true, projectId: true },
  });
  if (!roleContext) throw AppError.notFound("Role not found");
  if (roleContext.isSystem) {
    throw AppError.forbidden("Cannot remove permissions from a system role");
  }

  // Scope-aware permission assertion
  if (roleContext.projectId) {
    const projectScope = { type: "project" as const, id: roleContext.projectId, workspaceId };
    await ctx.permissions.assert("project:role:assign-permission", projectScope);
  } else {
    const workspaceScope = { type: "workspace" as const, id: workspaceId };
    await ctx.permissions.assert("workspace:role:assign-permission", workspaceScope);
  }

  // Step 2: Invalidate cached role permission set + all members holding this role
  // Must be done BEFORE deletion so we can still fetch members by roleId
  let memberUserIds: string[];
  if (roleContext.projectId) {
    const projectMembers = await ctx.db.projectMember.findMany({
      where: { projectId: roleContext.projectId, projectRoleId: roleId },
      select: { userId: true },
    });
    memberUserIds = projectMembers.map((m) => m.userId);
  } else {
    const workspaceMembers = await ctx.db.workspaceMember.findMany({
      where: { roleId },
      select: { userId: true },
    });
    memberUserIds = workspaceMembers.map((m) => m.userId);
  }
  await ctx.permissions.invalidate.invalidateRole(roleId, memberUserIds);

  // Step 3: Delete the RolePermission row
  return deleteRolePermission(roleId, workspaceId, permissionId, ctx.db);
};
