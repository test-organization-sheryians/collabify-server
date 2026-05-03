import type { NotificationHandler, Recipient } from "../../types";
import type { Payload } from "./definition";
import { urls, pushOf } from "../../_shared/build-helpers";

export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> {
    return [{ userId: payload.assigneeId, email: null }];
  },
  async buildInApp(payload) {
    return {
      title:      `#${payload.issueNumber} moved to ${payload.newStatus}`,
      body:       `${payload.actorName} changed the status in ${payload.projectName}.`,
      actionUrl:  urls.issue(payload.workspaceSlug, payload.issueId),
      entityType: "ISSUE", entityId: payload.issueId, actorId: payload.actorId,
    };
  },
};

