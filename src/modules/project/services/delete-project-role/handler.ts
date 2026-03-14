/**
 * deleteProjectRole — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - assertProjectManager
 *   - permissions.assert("project.role:delete")
 * Steps:
 *   1. [auth] parallel
 *   2. removeProjectRole — guard isSystem + no active members, then delete
 */
import { AppError } from "@/shared/errors";
import type { DeleteProjectRoleInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { removeProjectRole } from "./steps/remove-project-role";

export const deleteProjectRole = async (
  input: DeleteProjectRoleInput,
  ctx: ServiceContext
) => {
  const { roleId, projectId, workspaceId } = input;
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();
  const scope = { type: "project" as const, id: projectId, workspaceId };
  await Promise.all([
    ctx.authGate.assertProjectManager(projectId, workspaceId),
    ctx.permissions.assert("project.role:delete", scope),
  ]);

  // TODO: invalidate role-members cache once AuthGateInvalidator is wired to ServiceContext
  return removeProjectRole(roleId, projectId, workspaceId, ctx.db);
};
