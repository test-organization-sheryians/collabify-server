import type { NotificationHandler, Recipient } from "../../types";
import type { Payload } from "./definition";
import { urls } from "../../_shared/build-helpers";

export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> {
    return payload.memberIds.map((id) => ({ userId: id, email: null }));
  },
  async buildInApp(payload) {
    return {
      title:      `${payload.projectName} was archived`,
      body:       `${payload.actorName} archived this project.`,
      actionUrl:  urls.project(payload.workspaceSlug, payload.projectId),
      entityType: "PROJECT",
      entityId:   payload.projectId,
      actorId:    payload.actorId,
    };
  },
};
