/**
 * addProjectMember — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - permissions.assert("project:member:add") — MANAGER+ only (RBAC)
 * Steps:
 *   1. [auth] assert("project:member:add")
 *   2. verifyTargetIsWorkspaceMember  — BAD_REQUEST if target not in workspace
 *   3. enforceWorkspaceGuestCeiling   — silently substitutes GUEST role if workspace rank <= 10
 *   4. createProjectMember            — create row with effective role; CONFLICT if already member
 */
import { AppError } from "@/shared/errors";
import type { AddProjectMemberInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { verifyTargetIsWorkspaceMember } from "./steps/verify-target-is-workspace-member";
import { enforceWorkspaceGuestCeiling } from "./steps/enforce-workspace-guest-ceiling";
import { createProjectMember } from "./steps/create-project-member";

export const addProjectMember = async (
  input: AddProjectMemberInput,
  ctx: ServiceContext
) => {
  const { projectId, workspaceId, actorUserId, targetUserId, roleId } = input;
  const { db } = ctx;

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const scope = { type: "project" as const, id: projectId, workspaceId };
  await ctx.permissions.assert("project:member:add", scope);

  await verifyTargetIsWorkspaceMember(workspaceId, targetUserId, db);

  const effectiveRoleId = await enforceWorkspaceGuestCeiling(
    workspaceId,
    targetUserId,
    roleId,
    db,
    { mode: "add" }
  );

  return createProjectMember(projectId, workspaceId, targetUserId, db, effectiveRoleId);
};
