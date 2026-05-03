/**
 * assignRolePermission — Service Handler (thin orchestrator)
 *
 * Assigns (or updates) a permission grant/deny on a role.
 * Works for both workspace roles and project roles — roleId identifies the role.
 *
 * Auth (scope-aware):
 *   - Project role → assert("project:role:assign-permission", ProjectScope)
 *   - Workspace role → assert("workspace:role:assign-permission", WorkspaceScope)
 * Anti-escalation guards:
 *   - Caller must possess the permission they are granting (ALLOW effect only)
 *   - Caller's role rank must be strictly greater than target role's rank
 * Cache Invalidation:
 *   - invalidator.permissions.invalidateRole(roleId) — clears roleperms:{roleId}
 *     and bulk-DEL perm:* for all users holding this role via role-members index
 */
import { AppError } from "@/shared/errors";
import type { AssignRolePermissionInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import type { AppPermission } from "@/modules/authorization/types/app-permissions";
import { upsertRolePermission } from "./steps/upsert-role-permission";

export const assignRolePermission = async (
  input: AssignRolePermissionInput,
  ctx: ServiceContext
) => {
  const { roleId, workspaceId, permissionId, effect, conditions } = input;
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  // Step 1: Determine role scope (project vs workspace) and lookup role metadata
  const roleContext = await ctx.db.role.findUnique({
    where: { id: roleId },
    select: { isSystem: true, rank: true, projectId: true, workspaceId: true },
  });
  if (!roleContext) throw AppError.notFound("Role not found");
  if (roleContext.isSystem) {
    throw AppError.forbidden("Cannot assign permissions to a system role");
  }

  // Step 2: Scope-aware permission assertion + actor membership lookup
  let actorRank: number;
  if (roleContext.projectId) {
    // Project role — assert project:role:assign-permission at ProjectScope
    const projectScope = { type: "project" as const, id: roleContext.projectId, workspaceId };
    await ctx.permissions.assert("project:role:assign-permission", projectScope);

    const actorMember = await ctx.db.projectMember.findUnique({
      where: { projectId_userId: { projectId: roleContext.projectId, userId: ctx.auth.userId! } },
      select: { projectRole: { select: { rank: true } } },
    });
    if (!actorMember) throw AppError.forbidden("Actor is not a project member");
    // If actor has no project-specific role, skip rank check (workspace owner fallback)
    actorRank = actorMember.projectRole?.rank ?? 0;
  } else {
    // Workspace role — assert workspace:role:assign-permission at WorkspaceScope
    const workspaceScope = { type: "workspace" as const, id: workspaceId };
    await ctx.permissions.assert("workspace:role:assign-permission", workspaceScope);

    const actorMember = await ctx.db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: ctx.auth.userId! } },
      select: { assignedRole: { select: { rank: true } } },
    });
    if (!actorMember) throw AppError.forbidden("Actor is not a workspace member");
    actorRank = actorMember.assignedRole.rank;
  }

  // Anti-escalation Guard 1: caller's rank must be strictly greater than the target role's rank
  if (actorRank <= roleContext.rank) {
    throw AppError.forbidden(
      "You can only assign permissions to roles with a lower rank than your own"
    );
  }

  // Anti-escalation Guard 2: caller must possess the permission they are granting (ALLOW only)
  // Skip for DENY effect — revoking a permission doesn't require possessing it
  if (effect === "ALLOW") {
    const permRow = await ctx.db.permission.findUnique({
      where: { id: permissionId },
      select: { resource: true, action: true },
    });
    if (!permRow) throw AppError.notFound("Permission not found");

    const permString = `${permRow.resource}:${permRow.action}` as AppPermission;
    // Use the correct scope for the permission check
    const checkScope = roleContext.projectId
      ? { type: "project" as const, id: roleContext.projectId, workspaceId }
      : { type: "workspace" as const, id: workspaceId };
    const callerHasPerm = await ctx.permissions.can(permString, checkScope as any);
    if (!callerHasPerm) {
      throw AppError.forbidden(
        `You cannot grant a permission you do not possess: ${permString}`
      );
    }
  }

  const result = await upsertRolePermission(
    roleId,
    workspaceId,
    permissionId,
    effect,
    conditions,
    ctx.db,
    roleContext.projectId ?? undefined
  );

  // Invalidate cached role permission set + all members holding this role
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

  return {
    ...result,
    conditions: result.conditions != null ? JSON.stringify(result.conditions) : null,
  };
};
