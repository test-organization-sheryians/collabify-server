/**
 * cancelWorkspaceInvite — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - permissions.assert("workspace:invite:cancel") — ADMIN+ only (RBAC)
 * Steps:
 *   1. [auth] assert("workspace:invite:cancel")
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
  await ctx.permissions.assert("workspace:invite:cancel", scope);

  await deleteInvite(inviteId, workspaceId, db);
  return true;
};
