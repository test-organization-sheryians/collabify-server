import type { NotificationHandler, Recipient, HandlerContext } from "../../types";
import type { Payload } from "./definition";
import { urls, pushOf } from "../../_shared/build-helpers";

export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> {
    return [{ userId: payload.assigneeId, email: null }];
  },

  async shouldDeliver(payload, _r, ctx: HandlerContext): Promise<boolean> {
    const issue = await ctx.db.issue.findUnique({
      where: { id: payload.issueId }, select: { dueDate: true, status: true },
    }).catch(() => null);
    if (!issue?.dueDate) return false;
    if (issue.status === "DONE" || issue.status === "CANCELLED") return false;
    return true;
  },

  async buildInApp(payload) {
    return {
      title:      `Due in ${payload.daysUntilDue} day${payload.daysUntilDue === 1 ? "" : "s"}: #${payload.issueNumber}`,
      body:       `${payload.issueTitle} is due on ${new Date(payload.dueDate).toLocaleDateString()}.`,
      actionUrl:  urls.issue(payload.workspaceSlug, payload.issueId),
      entityType: "ISSUE", entityId: payload.issueId,
    };
  },

  async buildPush(payload) {
    return pushOf(
      `Due soon: #${payload.issueNumber}`,
      `${payload.issueTitle} is due in ${payload.daysUntilDue} day${payload.daysUntilDue === 1 ? "" : "s"}`,
      { issueId: payload.issueId, workspaceSlug: payload.workspaceSlug }
    );
  },

  async buildEmail(payload) {
    return {
      to:       "",
      subject:  `Reminder: #${payload.issueNumber} is due in ${payload.daysUntilDue} day${payload.daysUntilDue === 1 ? "" : "s"}`,
      template: "issue-due-date",
      data: {
        issueTitle:   payload.issueTitle,
        issueNumber:  payload.issueNumber,
        projectName:  payload.projectName,
        dueDate:      payload.dueDate,
        daysUntilDue: payload.daysUntilDue,
        issueUrl:     urls.issue(payload.workspaceSlug, payload.issueId),
      },
    };
  },
};
