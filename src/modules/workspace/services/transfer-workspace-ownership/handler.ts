/**
 * transferWorkspaceOwnership — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. verifyActorIsOwner    — FORBIDDEN if not OWNER
 *   2. verifyTargetIsMember — NOT_FOUND if newOwner is not a member
 *   3. transferInTransaction — atomic OWNER swap; return new owner member
 */
import type { TransferWorkspaceOwnershipInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { verifyActorIsOwner } from "./steps/verify-actor-is-owner";
import { verifyTargetIsMember } from "./steps/verify-target-is-member";
import { transferInTransaction } from "./steps/transfer-in-transaction";

export const transferWorkspaceOwnership = async (
  input: TransferWorkspaceOwnershipInput,
  ctx: ServiceContext
) => {
  const { workspaceId, actorUserId, newOwnerId } = input;
  const { db } = ctx;

  await verifyActorIsOwner(workspaceId, actorUserId, db);
  await verifyTargetIsMember(workspaceId, newOwnerId, db);
  return transferInTransaction(workspaceId, actorUserId, newOwnerId, db);
};
