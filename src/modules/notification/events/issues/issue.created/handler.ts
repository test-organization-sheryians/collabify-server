import type { NotificationHandler, Recipient } from "../../types";
import type { Payload } from "./definition";
import { urls } from "../../_shared/build-helpers";
export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> {
    return payload.watcherIds.map((id) => ({ userId: id, email: null }));
  },
  async buildInApp(payload) {
    return {
      title:      `New issue: #${payload.issueNumber} ${payload.issueTitle}`,
      body:       `${payload.actorName} created a new issue in ${payload.projectName}.`,
      actionUrl:  urls.issue(payload.workspaceSlug, payload.issueId),
      entityType: "ISSUE", entityId: payload.issueId, actorId: payload.actorId,
    };
  },
};
