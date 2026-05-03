import type { NotificationHandler, Recipient } from "../../types";
import type { Payload } from "./definition";
import { urls } from "../../_shared/build-helpers";

export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> {
    // Both old and new owner are notified
    return [
      { userId: payload.previousOwnerId, email: null },
      { userId: payload.newOwnerId,      email: null },
    ];
  },

  async buildInApp(payload, recipient) {
    const isNewOwner = recipient.userId === payload.newOwnerId;
    return {
      title:      isNewOwner
        ? `You are now the owner of ${payload.workspaceName}`
        : `Ownership of ${payload.workspaceName} was transferred`,
      body:       isNewOwner
        ? `${payload.actorName} transferred workspace ownership to you.`
        : `${payload.actorName} transferred your workspace to another member.`,
      actionUrl:  urls.workspace(payload.workspaceSlug),
      entityType: "WORKSPACE",
      entityId:   payload.workspaceId,
      actorId:    payload.actorId,
    };
  },

  async buildEmail(payload, recipient) {
    const isNewOwner = recipient.userId === payload.newOwnerId;
    return {
      to:       "",
      subject:  isNewOwner
        ? `You're now the owner of ${payload.workspaceName}`
        : `${payload.workspaceName} ownership was transferred`,
      template: "workspace-ownership-transferred",
      data: {
        isNewOwner,
        actorName:    payload.actorName,
        workspaceName: payload.workspaceName,
        workspaceUrl: urls.workspace(payload.workspaceSlug),
      },
    };
  },
};
