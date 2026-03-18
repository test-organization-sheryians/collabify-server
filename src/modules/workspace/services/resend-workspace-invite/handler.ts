/**
 * resendWorkspaceInvite — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - assertWorkspaceAdminOrAbove — FORBIDDEN if rank < ADMIN
 *   - permissions.assert("workspace.member:invite") — RBAC check
 * Steps:
 *   1. [auth] assertWorkspaceAdminOrAbove + assert("workspace.member:invite") — parallel
 *   2. refreshInviteExpiry — extend expiry +7d; NOT_FOUND if missing
 */
import { AppError } from "@/shared/errors";
import type { ResendWorkspaceInviteInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { refreshInviteExpiry } from "./steps/refresh-invite-expiry";

export const resendWorkspaceInvite = async (
  input: ResendWorkspaceInviteInput,
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

  await refreshInviteExpiry(inviteId, workspaceId, db);
  return true;
};
