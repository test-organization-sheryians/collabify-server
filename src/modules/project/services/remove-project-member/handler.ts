/**
 * removeProjectMember — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - assertProjectManager — FORBIDDEN if actor cannot manage project
 *   - permissions.assert("project.member:remove") — RBAC check
 * Guards:
 *   - CONFLICT if actor is trying to remove themselves (use leaveProject instead)
 *   - CONFLICT if removing the last MANAGER — project must have at least one
 * Steps:
 *   1. [auth] assertProjectManager + assert("project.member:remove") — parallel
 *   2. Self-removal guard
 *   3. Last-manager guard
 *   4. deleteProjectMember — delete row; NOT_FOUND if target not a member
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

  // Guard 1: cannot remove yourself — use leaveProject instead
  if (actorUserId === targetUserId) {
    throw AppError.conflict(
      "You cannot remove yourself from a project. Use 'Leave Project' instead.",
      "CANNOT_REMOVE_SELF"
    );
  }

  const scope = { type: "project" as const, id: projectId, workspaceId };
  await Promise.all([
    ctx.authGate.assertProjectManager(projectId, workspaceId),
    ctx.permissions.assert("project.member:remove", scope),
  ]);

  // Guard 2: block removal of last MANAGER
  const managerRole = await db.role.findFirst({
    where: { projectId, name: "MANAGER" },
    select: { id: true },
  });

  if (managerRole) {
    const targetMember = await db.projectMember.findFirst({
      where: { projectId, userId: targetUserId },
      select: { projectRoleId: true },
    });

    if (targetMember?.projectRoleId === managerRole.id) {
      const managerCount = await db.projectMember.count({
        where: { projectId, projectRoleId: managerRole.id },
      });
      if (managerCount <= 1) {
        throw AppError.conflict(
          "Cannot remove the last MANAGER from a project. Assign another manager first or delete the project.",
          "LAST_MANAGER_REMOVAL"
        );
      }
    }
  }

  await deleteProjectMember(projectId, targetUserId, db);
  return true;
};
