/**
 * inviteToWorkspace — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - permissions.assert("workspace:member:invite") — ADMIN+ only (RBAC)
 * Steps:
 *   1. [auth] assert("workspace:member:invite")
 *   2. sendInvites — upsert invite rows with roleId, log links; return invited list
 */
import { AppError } from "@/shared/errors";
import type { InviteToWorkspaceInput } from "./types";
import type { ServiceContext } from "@/graphql/types";
import { sendInvites } from "./steps/send-invites";
import { emit } from "@/modules/notification/outbox/outbox-writer";

export const inviteToWorkspace = async (
  input: InviteToWorkspaceInput,
  ctx: ServiceContext
) => {
  const { workspaceId, emails, actorUserId, roleId } = input;
  const { db } = ctx;

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();
  const scope = { type: "workspace" as const, id: workspaceId };
  await ctx.permissions.assert("workspace:member:invite", scope);

  const [invitedEmails, workspace, actor, role] = await Promise.all([
    sendInvites(workspaceId, actorUserId, emails, roleId, db),
    db.workspace.findUnique({ where: { id: workspaceId }, select: { name: true, slug: true } }),
    db.user.findUnique({ where: { id: actorUserId }, select: { fullName: true } }),
    db.role.findUnique({ where: { id: roleId }, select: { name: true } }),
  ]);

  for (const email of invitedEmails) {
    await emit(db as any, {
      type: "workspace.invite.sent",
      payload: {
        workspaceId,
        workspaceName: workspace?.name ?? "",
        workspaceSlug: workspace?.slug ?? "",
        inviteToken: "",
        inviteId: "",
        inviteeEmail: email,
        inviteeUserId: null,
        actorId: actorUserId,
        actorName: actor?.fullName ?? "Someone",
        roleName: role?.name ?? "Member",
      },
    }).catch(() => { /* non-fatal */ });
  }

  return {
    success: true,
    message: `Invites sent to ${invitedEmails.length} users.`,
    invitedCount: invitedEmails.length,
  };
};
