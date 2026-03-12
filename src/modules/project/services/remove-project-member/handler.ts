/**
 * removeProjectMember — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - assertProjectManager — FORBIDDEN if actor cannot manage project
 *   - permissions.assert("project.member:remove") — RBAC check
 * Steps:
 *   1. [auth] assertProjectManager + assert("project.member:remove") — parallel
 *   2. deleteProjectMember — delete row; NOT_FOUND if target not a member
 */
import { AppError } from "@/shared/errors";
import type { RemoveProjectMemberInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { deleteProjectMember } from "./steps/delete-project-member";

export const removeProjectMember = async (
  input: RemoveProjectMemberInput,
  ctx: ServiceContext
) => {
  const { projectId, workspaceId, actorUserId, targetUserId } = input;
  const { db } = ctx;

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const scope = { type: "project" as const, id: projectId, workspaceId };
  await Promise.all([
    ctx.authGate.assertProjectManager(projectId, workspaceId),
    ctx.permissions.assert("project.member:remove", scope),
  ]);

  await deleteProjectMember(projectId, targetUserId, db);
  return true;
};
