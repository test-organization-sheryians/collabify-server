/**
 * leaveProject — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - assertProjectMember — cache-backed; FORBIDDEN if not a member (self-action)
 * Steps:
 *   1. [auth] assertProjectMember — membership gate (no RBAC needed)
 *   2. deleteProjectMembership — delete the actor's ProjectMember row
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
  await deleteProjectMembership(projectId, actorUserId, db);
  return true;
};
