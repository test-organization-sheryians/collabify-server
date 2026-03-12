/**
 * updateProjectMemberRole — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - assertProjectManager — FORBIDDEN if actor cannot manage project
 *   - permissions.assert("project.member:role-update") — RBAC check
 * Steps:
 *   1. [auth] assertProjectManager + assert("project.member:role-update") — parallel
 *   2. setProjectMemberRole — update roleId; NOT_FOUND if member or role missing
 */
import { AppError } from "@/shared/errors";
import type { UpdateProjectMemberRoleInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { setProjectMemberRole } from "./steps/set-project-member-role";

export const updateProjectMemberRole = async (
  input: UpdateProjectMemberRoleInput,
  ctx: ServiceContext
) => {
  const { projectId, workspaceId, actorUserId, targetUserId, roleId } = input;
  const { db } = ctx;

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const scope = { type: "project" as const, id: projectId, workspaceId };
  await Promise.all([
    ctx.authGate.assertProjectManager(projectId, workspaceId),
    ctx.permissions.assert("project.member:role-update", scope),
  ]);

  return setProjectMemberRole(projectId, targetUserId, roleId, db);
};
