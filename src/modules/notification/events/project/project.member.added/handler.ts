import type { NotificationHandler, Recipient } from "../../types";
import type { Payload } from "./definition";
import { urls, pushOf } from "../../_shared/build-helpers";

export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> {
    return [{ userId: payload.newMemberId, email: null }];
  },
  async buildInApp(payload) {
    return {
      title:      `You were added to ${payload.projectName}`,
      body:       `${payload.actorName} added you as ${payload.roleName}.`,
      actionUrl:  urls.project(payload.workspaceSlug, payload.projectId),
      entityType: "PROJECT",
      entityId:   payload.projectId,
      actorId:    payload.actorId,
    };
  },
  async buildPush(payload) {
    return pushOf(
      `Added to ${payload.projectName}`,
      `${payload.actorName} added you as ${payload.roleName}`,
      { projectId: payload.projectId, workspaceSlug: payload.workspaceSlug }
    );
  },
};
