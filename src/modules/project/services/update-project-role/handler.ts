/**
 * updateProjectRole — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - permissions.assert("project:role:update") — MANAGER+ only (RBAC)
 * Steps:
 *   1. [auth] assert("project:role:update")
 *   2. updateProjectRoleData — guard isSystem + rank escalation, then partial update
 *   3. [cache] invalidateRole — clear roleperms:{roleId} + all project members with this role
 */
import { AppError } from "@/shared/errors";
import type { UpdateProjectRoleInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { updateProjectRoleData } from "./steps/update-project-role-data";

export const updateProjectRole = async (
  input: UpdateProjectRoleInput,
  ctx: ServiceContext
) => {
  const { roleId, projectId, workspaceId, actorUserId, name, description, rank } = input;
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();
  const scope = { type: "project" as const, id: projectId, workspaceId };
  await ctx.permissions.assert("project:role:update", scope);

  const updated = await updateProjectRoleData(
    roleId,
    projectId,
    workspaceId,
    actorUserId,
    { name, description, rank },
    ctx.db
  );

  // Invalidate cached role permission set + all project members holding this role
  const roleMembers = await ctx.db.projectMember.findMany({
    where: { projectId, projectRoleId: roleId },
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
