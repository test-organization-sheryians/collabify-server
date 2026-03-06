/**
 * leaveWorkspace — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. verifyNotLastOwner  — OWNER cannot leave if sole owner; BAD_REQUEST
 *   2. deleteSelfMembership — delete the actor's WorkspaceMember row
 */
import type { LeaveWorkspaceInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { verifyNotLastOwner } from "./steps/verify-not-last-owner";
import { deleteSelfMembership } from "./steps/delete-self-membership";

export const leaveWorkspace = async (
  input: LeaveWorkspaceInput,
  ctx: ServiceContext
) => {
  const { workspaceId, actorUserId } = input;
  const { db } = ctx;

  await verifyNotLastOwner(workspaceId, actorUserId, db);
  await deleteSelfMembership(workspaceId, actorUserId, db);
  return true;
};
