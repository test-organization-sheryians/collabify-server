import type { NotificationHandler, Recipient } from "../../types";
import type { Payload } from "./definition";
import { urls } from "../../_shared/build-helpers";

export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> {
    return payload.adminIds.map((id) => ({ userId: id, email: null }));
  },

  async buildInApp(payload) {
    return {
      title:      `${payload.newMemberName} joined ${payload.workspaceName}`,
      body:       `A new member joined as ${payload.roleName}.`,
      actionUrl:  urls.workspace(payload.workspaceSlug),
      entityType: "WORKSPACE",
      entityId:   payload.workspaceId,
      actorId:    payload.newMemberId,
    };
  },
};
