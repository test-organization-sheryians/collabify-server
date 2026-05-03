/**
 * updateWorkspaceRole — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - permissions.assert("workspace:role:update") — ADMIN+ only (RBAC)
 * Steps:
 *   1. [auth] assert("workspace:role:update")
 *   2. updateRoleData — guard isSystem + rank escalation, then partial update
 * Cache Invalidation:
 *   - invalidator.permissions.invalidateRolePermissions(roleId) — clears roleperms:{roleId}
 */
import { AppError } from "@/shared/errors";
import type { UpdateWorkspaceRoleInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { updateRoleData } from "./steps/update-role-data";

export const updateWorkspaceRole = async (
  input: UpdateWorkspaceRoleInput,
  ctx: ServiceContext
) => {
  const { roleId, workspaceId, actorUserId, name, description, rank } = input;
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();
  const scope = { type: "workspace" as const, id: workspaceId };
  await ctx.permissions.assert("workspace:role:update", scope);

  const updated = await updateRoleData(
    roleId,
    workspaceId,
    actorUserId,
    { name, description, rank },
    ctx.db
  );

  // Invalidate permission cache for all members of this role
  const roleMembers = await ctx.db.workspaceMember.findMany({
    where: { roleId },
    select: { userId: true },
  });
  await ctx.permissions.invalidate.invalidateRole(
    roleId,
    roleMembers.map((m) => m.userId)
  );

  return {
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
};
