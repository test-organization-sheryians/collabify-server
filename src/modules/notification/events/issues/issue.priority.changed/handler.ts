import type { NotificationHandler, Recipient } from "../../types";
import type { Payload } from "./definition";
import { urls } from "../../_shared/build-helpers";
export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> {
    if (!payload.assigneeId) return [];
    return [{ userId: payload.assigneeId, email: null }];
  },
  async buildInApp(payload) {
    return {
      title:      `Priority changed on #${payload.issueNumber}`,
      body:       `${payload.actorName} changed priority from ${payload.oldPriority} → ${payload.newPriority}.`,
      actionUrl:  urls.issue(payload.workspaceSlug, payload.issueId),
      entityType: "ISSUE", entityId: payload.issueId, actorId: payload.actorId,
    };
  },
};
