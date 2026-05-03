import type { NotificationHandler, Recipient, HandlerContext } from "../../types";
import type { Payload } from "./definition";
import { urls, actorName } from "../../_shared/build-helpers";

export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> {
    // Invitee may not have an account yet — email-only delivery
    return [{ userId: payload.inviteeUserId, email: payload.inviteeEmail }];
  },

  async shouldDeliver(payload, _recipient, ctx: HandlerContext): Promise<boolean> {
    // Cancel delivery if invite was revoked before worker processes it
    const invite = await ctx.db.workspaceInvite.findUnique({
      where:  { id: payload.inviteId },
      select: { status: true },
    }).catch(() => null);
    return invite?.status === "PENDING";
  },

  async buildEmail(payload) {
    return {
      to:       payload.inviteeEmail,
      subject:  `${actorName(payload)} invited you to join ${payload.workspaceName}`,
      template: "workspace-invite",
      data: {
        inviterName:   payload.actorName,
        workspaceName: payload.workspaceName,
        roleName:      payload.roleName,
        acceptUrl:     urls.inviteAccept(payload.inviteToken),
      },
    };
  },

  async buildInApp(payload) {
    // Only show in-app if the invitee has an account
    if (!payload.inviteeUserId) return undefined;
    return {
      title:      `You've been invited to ${payload.workspaceName}`,
      body:       `${payload.actorName} invited you as ${payload.roleName}`,
      actionUrl:  urls.inviteAccept(payload.inviteToken),
      entityType: "WORKSPACE",
      entityId:   payload.workspaceId,
      actorId:    payload.actorId,
    };
  },
};
