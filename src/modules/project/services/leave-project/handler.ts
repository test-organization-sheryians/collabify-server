/**
 * leaveProject — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - assertProjectMember — cache-backed; FORBIDDEN if not a member (self-action)
 * Guards:
 *   - CONFLICT if actor is the last MANAGER — must delete project or reassign first
 * Steps:
 *   1. [auth] assertProjectMember — membership gate (no RBAC needed)
 *   2. Last-manager guard
 *   3. deleteProjectMembership — delete the actor's ProjectMember row
 */
import { AppError } from "@/shared/errors";
import type { LeaveProjectInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { deleteProjectMembership } from "./steps/delete-project-membership";

export const leaveProject = async (
  input: LeaveProjectInput,
  ctx: ServiceContext
) => {
  const { projectId, actorUserId } = input;
  const { db } = ctx;

  if (!ctx.authGate) throw AppError.unauthorized();

  await ctx.authGate.assertProjectMember(projectId);

  // Guard: last manager cannot leave
  const managerRole = await db.role.findFirst({
    where: { projectId, name: "MANAGER" },
    select: { id: true },
  });

  if (managerRole) {
    const actorMember = await db.projectMember.findFirst({
      where: { projectId, userId: actorUserId },
      select: { projectRoleId: true },
    });

    if (actorMember?.projectRoleId === managerRole.id) {
      const managerCount = await db.projectMember.count({
        where: { projectId, projectRoleId: managerRole.id },
      });
      if (managerCount <= 1) {
        throw AppError.conflict(
          "You are the last manager of this project. Assign another manager first or delete the project.",
          "LAST_MANAGER_LEAVE"
        );
      }
    }
  }

  await deleteProjectMembership(projectId, actorUserId, db);
  return true;
};
