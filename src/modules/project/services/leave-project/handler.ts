/**
 * leaveProject — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. verifyIsMember          — NOT_FOUND if actor is not a project member
 *   2. deleteProjectMembership — delete the actor's ProjectMember row
 */
import type { LeaveProjectInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { verifyIsMember } from "./steps/verify-is-member";
import { deleteProjectMembership } from "./steps/delete-project-membership";

export const leaveProject = async (
  input: LeaveProjectInput,
  ctx: ServiceContext
) => {
  const { projectId, actorUserId } = input;
  const { db } = ctx;

  await verifyIsMember(projectId, actorUserId, db);
  await deleteProjectMembership(projectId, actorUserId, db);
  return true;
};
