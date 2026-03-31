/**
 * updateProjectMemberRole — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - permissions.assert("project:member:role-update") — MANAGER+ only (RBAC)
 * Steps:
 *   1. [auth] assert("project:member:role-update")
 *   2. enforceWorkspaceGuestCeiling — FORBIDDEN if target is a workspace GUEST and new role rank > 10
 *   3. setProjectMemberRole — update roleId; NOT_FOUND if member or role missing
 */
import { AppError } from "@/shared/errors";
import type { UpdateProjectMemberRoleInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { enforceWorkspaceGuestCeiling } from "../add-project-member/steps/enforce-workspace-guest-ceiling";
import { setProjectMemberRole } from "./steps/set-project-member-role";

export const updateProjectMemberRole = async (
  input: UpdateProjectMemberRoleInput,
  ctx: ServiceContext
) => {
  const { projectId, workspaceId, actorUserId, targetUserId, roleId } = input;
  const { db } = ctx;

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const scope = { type: "project" as const, id: projectId, workspaceId };
  await ctx.permissions.assert("project:member:role-update", scope);

  // Workspace GUEST ceiling: cannot elevate a GUEST to CONTRIBUTOR or MANAGER
  await enforceWorkspaceGuestCeiling(workspaceId, targetUserId, roleId, db, {
    mode: "update",
  });

  return setProjectMemberRole(projectId, targetUserId, roleId, db);
};
