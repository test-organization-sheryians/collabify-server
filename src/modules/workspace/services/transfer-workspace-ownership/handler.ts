/**
 * transferWorkspaceOwnership — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - assertWorkspaceOwner — FORBIDDEN if not OWNER
 *   - permissions.assert("workspace:transfer") — RBAC check
 * Steps:
 *   1. [auth] assertWorkspaceOwner + assert("workspace:transfer") — parallel
 *   2. verifyTargetIsMember  — NOT_FOUND if newOwner is not a member
 *   3. transferInTransaction — atomic OWNER swap; return new owner member
 */
import { AppError } from "@/shared/errors";
import type { TransferWorkspaceOwnershipInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { verifyTargetIsMember } from "./steps/verify-target-is-member";
import { transferInTransaction } from "./steps/transfer-in-transaction";

export const transferWorkspaceOwnership = async (
  input: TransferWorkspaceOwnershipInput,
  ctx: ServiceContext
) => {
  const { workspaceId, actorUserId, newOwnerId } = input;
  const { db } = ctx;

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();
  const scope = { type: "workspace" as const, id: workspaceId };
  await Promise.all([
    ctx.authGate.assertWorkspaceOwner(workspaceId),
    ctx.permissions.assert("workspace:transfer", scope),
  ]);

  await verifyTargetIsMember(workspaceId, newOwnerId, db);
  return transferInTransaction(workspaceId, actorUserId, newOwnerId, db);
};
