/**
 * leaveWorkspace — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - assertWorkspaceMember — cache-backed; FORBIDDEN if not a member
 * Steps:
 *   1. [auth] assertWorkspaceMember — membership gate (self-action, no RBAC needed)
 *   2. verifyNotLastOwner  — OWNER cannot leave if sole owner; BAD_REQUEST
 *   3. deleteSelfMembership — delete the actor's WorkspaceMember row
 */
import { AppError } from "@/shared/errors";
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

  if (!ctx.authGate) throw AppError.unauthorized();
  await ctx.authGate.assertWorkspaceMember(workspaceId);
  await verifyNotLastOwner(workspaceId, actorUserId, db);
  await deleteSelfMembership(workspaceId, actorUserId, db);
  return true;
};
