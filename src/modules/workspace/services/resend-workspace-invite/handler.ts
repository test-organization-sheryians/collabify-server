/**
 * resendWorkspaceInvite — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - permissions.assert("workspace:invite:resend") — ADMIN+ only (RBAC)
 * Steps:
 *   1. [auth] assert("workspace:invite:resend")
 *   2. refreshInviteExpiry — extend expiry +7d; NOT_FOUND if missing
 */
import { AppError } from "@/shared/errors";
import type { ResendWorkspaceInviteInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { refreshInviteExpiry } from "./steps/refresh-invite-expiry";
import { emit } from "@/modules/notification/outbox/outbox-writer";

export const resendWorkspaceInvite = async (
  input: ResendWorkspaceInviteInput,
  ctx: ServiceContext
) => {
  const { inviteId, workspaceId, actorUserId } = input;
  const { db } = ctx;

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();
  const scope = { type: "workspace" as const, id: workspaceId };
  await ctx.permissions.assert("workspace:invite:resend", scope);

  const invite = await refreshInviteExpiry(inviteId, workspaceId, db);

  // Look up context for notification payload
  const [actor, workspace] = await Promise.all([
    db.user.findUnique({ where: { id: actorUserId }, select: { fullName: true } }),
    db.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } }),
  ]);
  const role = await db.role.findUnique({ where: { id: invite.roleId }, select: { name: true } });

  await emit(db as any, {
    type: "workspace.invite.resent",
    payload: {
      inviteId,
      workspaceId,
      inviteeEmail:  invite.email,
      inviteeUserId: null,
      actorId:       actorUserId,
      actorName:     actor?.fullName ?? "A workspace admin",
      workspaceName: workspace?.name ?? "",
      roleName:      role?.name ?? "Member",
      inviteToken:   invite.token,
    },
    deduplicationId: `workspace.invite.resent:${inviteId}:${Date.now()}`,
  }).catch(() => { /* non-fatal */ });

  return true;
};
