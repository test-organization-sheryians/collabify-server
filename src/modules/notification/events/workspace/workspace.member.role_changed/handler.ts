import type { NotificationHandler, Recipient } from "../../types";
import type { Payload } from "./definition";
import { urls } from "../../_shared/build-helpers";

export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> {
    return [{ userId: payload.memberId, email: null }];
  },

  async buildInApp(payload) {
    return {
      title:      `Your role changed in ${payload.workspaceName}`,
      body:       `${payload.actorName} changed your role from ${payload.oldRoleName} to ${payload.newRoleName}.`,
      actionUrl:  urls.workspace(payload.workspaceSlug),
      entityType: "WORKSPACE",
      entityId:   payload.workspaceId,
      actorId:    payload.actorId,
    };
  },

  async buildEmail(payload) {
    return {
      to:       "",
      subject:  `Your role in ${payload.workspaceName} was updated`,
      template: "workspace-role-changed",
      data: {
        actorName:    payload.actorName,
        workspaceName: payload.workspaceName,
        oldRoleName:  payload.oldRoleName,
        newRoleName:  payload.newRoleName,
        workspaceUrl: urls.workspace(payload.workspaceSlug),
      },
    };
  },
};
