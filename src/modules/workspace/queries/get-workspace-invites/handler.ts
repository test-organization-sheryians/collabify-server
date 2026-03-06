/**
 * getWorkspaceInvites — Query Handler (thin orchestrator)
 *
 * Steps:
 *   1. verifyActorIsAtLeastAdmin — FORBIDDEN if rank < 80
 *   2. fetchPendingInvites       — load all non-expired invites
 */
import type { GetWorkspaceInvitesInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { verifyActorIsAtLeastAdmin } from "./steps/verify-actor-is-at-least-admin";
import { fetchPendingInvites } from "./steps/fetch-pending-invites";

export const getWorkspaceInvites = async (
  input: GetWorkspaceInvitesInput,
  ctx: ServiceContext
) => {
  const { workspaceId, actorUserId } = input;
  const { db } = ctx;

  await verifyActorIsAtLeastAdmin(workspaceId, actorUserId, db);
  return fetchPendingInvites(workspaceId, db);
};
