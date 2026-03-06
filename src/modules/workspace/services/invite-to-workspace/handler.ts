/**
 * inviteToWorkspace — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. verifyActorMembership — assert actor is a workspace member
 *   2. sendInvites           — upsert invite rows, log links; return invited list
 */
import type { InviteToWorkspaceInput } from "./types";
import type { ServiceContext } from "@/graphql/types";
import { verifyActorMembership } from "./steps/verify-actor-membership";
import { sendInvites } from "./steps/send-invites";

export const inviteToWorkspace = async (
  input: InviteToWorkspaceInput,
  ctx: ServiceContext
) => {
  const { workspaceId, emails, actorUserId } = input;
  const { db } = ctx;

  await verifyActorMembership(workspaceId, actorUserId, db);
  const invitedEmails = await sendInvites(workspaceId, actorUserId, emails, db);

  return {
    success: true,
    message: `Invites sent to ${invitedEmails.length} users.`,
    invitedCount: invitedEmails.length,
  };
};
