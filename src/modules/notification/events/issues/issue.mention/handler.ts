import type { NotificationHandler, Recipient } from "../../types";
import type { Payload } from "./definition";
import { urls, pushOf } from "../../_shared/build-helpers";

export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> {
    return [{ userId: payload.mentionedUserId, email: null }];
  },

  async buildInApp(payload) {
    return {
      title:      `${payload.actorName} mentioned you in an issue`,
      body:       `#${payload.issueNumber} ${payload.issueTitle}${payload.contextSnippet ? `: "${payload.contextSnippet}"` : ""}`,
      actionUrl:  urls.issue(payload.workspaceSlug, payload.issueId),
      entityType: "ISSUE",
      entityId:   payload.issueId,
      actorId:    payload.actorId,
    };
  },

  async buildPush(payload) {
    return pushOf(
      `${payload.actorName} mentioned you`,
      `In issue #${payload.issueNumber}: ${payload.issueTitle}`,
      { issueId: payload.issueId, workspaceSlug: payload.workspaceSlug }
    );
  },

  async buildEmail(payload) {
    return {
      to:       "",
      subject:  `${payload.actorName} mentioned you in #${payload.issueNumber}`,
      template: "issue-mention",
      data: {
        actorName:      payload.actorName,
        issueTitle:     payload.issueTitle,
        issueNumber:    payload.issueNumber,
        projectName:    payload.projectName,
        contextSnippet: payload.contextSnippet,
        issueUrl:       urls.issue(payload.workspaceSlug, payload.issueId),
      },
    };
  },
};
