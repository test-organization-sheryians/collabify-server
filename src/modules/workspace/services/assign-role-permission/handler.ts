/**
 * assignRolePermission — Service Handler (thin orchestrator)
 *
 * Assigns (or updates) a permission grant/deny on a role.
 * Works for both workspace roles and project roles — roleId identifies the role.
 *
 * Auth:
 *   - permissions.assert("workspace:role:assign-permission") — ADMIN+ only (RBAC)
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
  const scope = { type: "workspace" as const, id: workspaceId };
  await ctx.permissions.assert("workspace:role:assign-permission", scope);

  // Guard: system roles are immutable — their permissions cannot be modified
  const [role, targetRole, actorMember] = await Promise.all([
    ctx.db.role.findUnique({
      where: { id: roleId },
      select: { isSystem: true, rank: true },
    }),
    ctx.db.role.findUnique({
      where: { id: roleId },
      select: { rank: true },
    }),
    ctx.db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: ctx.auth.userId! } },
      select: { assignedRole: { select: { rank: true } } },
    }),
  ]);

  if (role?.isSystem) {
    throw AppError.forbidden("Cannot assign permissions to a system role");
  }
  if (!actorMember) {
    throw AppError.forbidden("Actor is not a workspace member");
  }
  if (!targetRole) {
    throw AppError.notFound("Target role not found");
  }

  // Anti-escalation Guard 1: caller's rank must be strictly greater than the target role's rank
  if (actorMember.assignedRole.rank <= targetRole.rank) {
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
    const callerHasPerm = await ctx.permissions.can(permString, scope as any);
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

