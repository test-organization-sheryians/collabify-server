/**
 * cancelWorkspaceInvite — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. verifyActorIsAtLeastAdmin — FORBIDDEN if rank < 80
 *   2. deleteInvite              — delete invite; NOT_FOUND if missing/wrong workspace
 */
import type { CancelWorkspaceInviteInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { verifyActorIsAtLeastAdmin } from "./steps/verify-actor-is-at-least-admin";
import { deleteInvite } from "./steps/delete-invite";

export const cancelWorkspaceInvite = async (
  input: CancelWorkspaceInviteInput,
  ctx: ServiceContext
) => {
  const { inviteId, workspaceId, actorUserId } = input;
  const { db } = ctx;

  await verifyActorIsAtLeastAdmin(workspaceId, actorUserId, db);
  await deleteInvite(inviteId, workspaceId, db);
  return true;
};
