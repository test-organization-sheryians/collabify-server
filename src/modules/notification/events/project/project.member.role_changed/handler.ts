import type { NotificationHandler, Recipient } from "../../types";
import type { Payload } from "./definition";
import { urls } from "../../_shared/build-helpers";

export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> {
    return [{ userId: payload.memberId, email: null }];
  },
  async buildInApp(payload) {
    return {
      title:      `Your role in ${payload.projectName} changed`,
      body:       `${payload.actorName} changed your role from ${payload.oldRoleName} to ${payload.newRoleName}.`,
      actionUrl:  urls.project(payload.workspaceSlug, payload.projectId),
      entityType: "PROJECT",
      entityId:   payload.projectId,
      actorId:    payload.actorId,
    };
  },
};
