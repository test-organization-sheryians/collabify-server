/**
 * resendWorkspaceInvite — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. verifyActorIsAtLeastAdmin — FORBIDDEN if rank < 80
 *   2. refreshInviteExpiry       — extend expiry +7d; NOT_FOUND if missing
 */
import type { ResendWorkspaceInviteInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { verifyActorIsAtLeastAdmin } from "./steps/verify-actor-is-at-least-admin";
import { refreshInviteExpiry } from "./steps/refresh-invite-expiry";

export const resendWorkspaceInvite = async (
  input: ResendWorkspaceInviteInput,
  ctx: ServiceContext
) => {
  const { inviteId, workspaceId, actorUserId } = input;
  const { db } = ctx;

  await verifyActorIsAtLeastAdmin(workspaceId, actorUserId, db);
  await refreshInviteExpiry(inviteId, workspaceId, db);
  return true;
};
