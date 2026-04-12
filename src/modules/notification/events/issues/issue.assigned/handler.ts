import type { NotificationHandler, Recipient, HandlerContext } from "../../types";
import type { Payload } from "./definition";
import { urls, pushOf } from "../../_shared/build-helpers";

export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> {
    return [{ userId: payload.assigneeId, email: null }];
  },

  async shouldDeliver(payload, _r, ctx: HandlerContext): Promise<boolean> {
    const issue = await ctx.db.issue.findUnique({
      where:  { id: payload.issueId },
      select: { assigneeId: true },
    }).catch(() => null);
    // Cancel if reassigned to someone else before we delivered
    return issue?.assigneeId === payload.assigneeId;
  },

  async buildInApp(payload) {
    return {
      title:      `Assigned to you: #${payload.issueNumber} ${payload.issueTitle}`,
      body:       `${payload.actorName} assigned you to this issue in ${payload.projectName}.`,
      actionUrl:  urls.issue(payload.workspaceSlug, payload.issueId),
      entityType: "ISSUE",
      entityId:   payload.issueId,
      actorId:    payload.actorId,
    };
  },

  async buildPush(payload) {
    return pushOf(
      `Assigned: #${payload.issueNumber}`,
      `${payload.actorName} assigned you in ${payload.projectName}`,
      { issueId: payload.issueId, workspaceSlug: payload.workspaceSlug }
    );
  },

  async buildEmail(payload) {
    return {
      to:       "",
      subject:  `You were assigned to #${payload.issueNumber}: ${payload.issueTitle}`,
      template: "issue-assigned",
      data: {
        actorName:   payload.actorName,
        issueTitle:  payload.issueTitle,
        issueNumber: payload.issueNumber,
        projectName: payload.projectName,
        issueUrl:    urls.issue(payload.workspaceSlug, payload.issueId),
      },
    };
  },
};
