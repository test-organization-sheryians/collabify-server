import type { NotificationHandler, Recipient } from "../../types";
import type { Payload } from "./definition";
import { urls } from "../../_shared/build-helpers";
export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> {
    return [{ userId: payload.unassignedUserId, email: null }];
  },
  async buildInApp(payload) {
    return {
      title:      `Unassigned from #${payload.issueNumber}`,
      body:       `${payload.actorName} removed you from "${payload.issueTitle}" in ${payload.projectName}.`,
      actionUrl:  urls.issue(payload.workspaceSlug, payload.issueId),
      entityType: "ISSUE", entityId: payload.issueId, actorId: payload.actorId,
    };
  },
};
