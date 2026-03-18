/**
 * updateProjectRole — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - assertProjectManager
 *   - permissions.assert("project.role:update")
 * Steps:
 *   1. [auth] parallel
 *   2. updateProjectRoleData — guard isSystem + rank escalation, then partial update
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
  await Promise.all([
    ctx.authGate.assertProjectManager(projectId, workspaceId),
    ctx.permissions.assert("project.role:update", scope),
  ]);

  const updated = await updateProjectRoleData(
    roleId,
    projectId,
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
