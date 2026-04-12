/**
 * transferWorkspaceOwnership — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - permissions.assert("workspace:transfer") — OWNER only (RBAC)
 * Steps:
 *   1. [auth] assert("workspace:transfer")
 *   2. verifyTargetIsMember  — NOT_FOUND if newOwner is not a member
 *   3. transferInTransaction — atomic OWNER swap; return new owner member
 */
import { AppError } from "@/shared/errors";
import type { TransferWorkspaceOwnershipInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { verifyTargetIsMember } from "./steps/verify-target-is-member";
import { transferInTransaction } from "./steps/transfer-in-transaction";
import { emit } from "@/modules/notification/outbox/outbox-writer";

export const transferWorkspaceOwnership = async (
  input: TransferWorkspaceOwnershipInput,
  ctx: ServiceContext
) => {
  const { workspaceId, actorUserId, newOwnerId } = input;
  const { db } = ctx;

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();
  const scope = { type: "workspace" as const, id: workspaceId };
  await ctx.permissions.assert("workspace:transfer", scope);

  await verifyTargetIsMember(workspaceId, newOwnerId, db);
  const result = await transferInTransaction(workspaceId, actorUserId, newOwnerId, db);

  // Fetch names needed for notification payload
  const [workspace, actor] = await Promise.all([
    db.workspace.findUnique({ where: { id: workspaceId }, select: { name: true, slug: true } }),
    db.user.findUnique({ where: { id: actorUserId }, select: { fullName: true } }),
  ]);

  await db.$transaction((tx) => emit(tx, {
    type: "workspace.ownership.transferred",
    payload: {
      workspaceId,
      workspaceName:    workspace?.name ?? "",
      workspaceSlug:    workspace?.slug ?? "",
      previousOwnerId:  actorUserId,
      newOwnerId,
      actorId:          actorUserId,
      actorName:        actor?.fullName ?? "A workspace admin",
    },
  })).catch(() => { /* non-fatal */ });

  return result;
};
