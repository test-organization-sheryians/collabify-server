/**
 * cancelWorkspaceInvite — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - assertWorkspaceAdminOrAbove — FORBIDDEN if rank < ADMIN
 *   - permissions.assert("workspace.member:invite") — RBAC check
 * Steps:
 *   1. [auth] assertWorkspaceAdminOrAbove + assert("workspace.member:invite") — parallel
 *   2. deleteInvite — delete invite; NOT_FOUND if missing/wrong workspace
 */
import { AppError } from "@/shared/errors";
import type { CancelWorkspaceInviteInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { deleteInvite } from "./steps/delete-invite";

export const cancelWorkspaceInvite = async (
  input: CancelWorkspaceInviteInput,
  ctx: ServiceContext
) => {
  const { inviteId, workspaceId, actorUserId } = input;
  const { db } = ctx;

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();
  const scope = { type: "workspace" as const, id: workspaceId };
  await Promise.all([
    ctx.authGate.assertWorkspaceAdminOrAbove(workspaceId),
    ctx.permissions.assert("workspace.member:invite", scope),
  ]);

  await deleteInvite(inviteId, workspaceId, db);
  return true;
};
