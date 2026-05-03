import type { NotificationHandler, Recipient } from "../../types";
import type { Payload } from "./definition";
import { urls } from "../../_shared/build-helpers";

export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> {
    return [{ userId: payload.removedUserId, email: null }];
  },

  async buildInApp(payload) {
    return {
      title:      `You were removed from ${payload.workspaceName}`,
      body:       `${payload.actorName} removed you from the workspace.`,
      actionUrl:  "/",
      entityType: "WORKSPACE",
      entityId:   payload.workspaceId,
      actorId:    payload.actorId,
    };
  },

  async buildEmail(payload) {
    return {
      to:       "", // resolved from user record by email worker
      subject:  `You've been removed from ${payload.workspaceName}`,
      template: "workspace-member-removed",
      data: { actorName: payload.actorName, workspaceName: payload.workspaceName },
    };
  },
};
