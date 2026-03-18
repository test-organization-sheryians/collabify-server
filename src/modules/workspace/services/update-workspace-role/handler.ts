/**
 * updateWorkspaceRole — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - assertWorkspaceAdminOrAbove
 *   - permissions.assert("workspace.role:update")
 * Steps:
 *   1. [auth] parallel
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
  await Promise.all([
    ctx.authGate.assertWorkspaceAdminOrAbove(workspaceId),
    ctx.permissions.assert("workspace.role:update", scope),
  ]);

  const updated = await updateRoleData(
    roleId,
    workspaceId,
    actorUserId,
    { name, description, rank },
    ctx.db
  );

  // TODO: invalidate roleperms:{roleId} cache once AuthGateInvalidator is wired to ServiceContext

  return {
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
};
