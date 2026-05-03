import type { NotificationHandler, Recipient } from "../../types";
import type { Payload } from "./definition";
import { urls } from "../../_shared/build-helpers";

export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> {
    return [{ userId: payload.ownerId, email: null }];
  },

  async buildInApp(payload) {
    return {
      title:      `${payload.inviteeName} joined ${payload.workspaceName}`,
      body:       "Your invite was accepted. They're now part of the workspace.",
      actionUrl:  urls.workspace(payload.workspaceSlug),
      entityType: "WORKSPACE",
      entityId:   payload.workspaceId,
      actorId:    payload.inviteeId,
    };
  },
};
