import type { NotificationHandler, Recipient } from "../../types";
import type { Payload } from "./definition";
export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> {
    return payload.watcherIds.map((id) => ({ userId: id, email: null }));
  },
  async buildInApp(payload) {
    return {
      title:      `Issue deleted: #${payload.issueNumber}`,
      body:       `${payload.actorName} deleted "${payload.issueTitle}" in ${payload.projectName}.`,
      actionUrl:  `/`,
      entityType: "ISSUE", entityId: payload.issueId, actorId: payload.actorId,
    };
  },
};
