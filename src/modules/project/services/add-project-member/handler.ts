/**
 * addProjectMember — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - assertProjectManager — FORBIDDEN if actor cannot manage project
 *   - permissions.assert("project.member:add") — RBAC check
 * Steps:
 *   1. [auth] assertProjectManager + assert("project.member:add") — parallel
 *   2. verifyTargetIsWorkspaceMember — BAD_REQUEST if target not in workspace
 *   3. createProjectMember          — create row; CONFLICT if already member
 */
import { AppError } from "@/shared/errors";
import type { AddProjectMemberInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { verifyTargetIsWorkspaceMember } from "./steps/verify-target-is-workspace-member";
import { createProjectMember } from "./steps/create-project-member";

export const addProjectMember = async (
  input: AddProjectMemberInput,
  ctx: ServiceContext
) => {
  const { projectId, workspaceId, actorUserId, targetUserId } = input;
  const { db } = ctx;

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const scope = { type: "project" as const, id: projectId, workspaceId };
  await Promise.all([
    ctx.authGate.assertProjectManager(projectId, workspaceId),
    ctx.permissions.assert("project.member:add", scope),
  ]);

  await verifyTargetIsWorkspaceMember(workspaceId, targetUserId, db);
  return createProjectMember(projectId, workspaceId, targetUserId, db);
};
