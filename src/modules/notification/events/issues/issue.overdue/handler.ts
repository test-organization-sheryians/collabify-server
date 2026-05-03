import type { NotificationHandler, Recipient, HandlerContext } from "../../types";
import type { Payload } from "./definition";
import { urls } from "../../_shared/build-helpers";
export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> {
    return [{ userId: payload.assigneeId, email: null }];
  },
  async shouldDeliver(payload, _r, ctx: HandlerContext): Promise<boolean> {
    const issue = await ctx.db.issue.findUnique({
      where: { id: payload.issueId }, select: { status: true },
    }).catch(() => null);
    if (issue?.status === "DONE" || issue?.status === "CANCELLED") return false;
    return true;
  },
  async buildInApp(payload) {
    return {
      title:      `Overdue: #${payload.issueNumber}`,
      body:       `${payload.issueTitle} was due ${payload.daysOverdue} day${payload.daysOverdue === 1 ? "" : "s"} ago.`,
      actionUrl:  urls.issue(payload.workspaceSlug, payload.issueId),
      entityType: "ISSUE", entityId: payload.issueId,
    };
  },
  async buildEmail(payload) {
    return {
      to: "", subject: `Overdue: #${payload.issueNumber} ${payload.issueTitle}`,
      template: "issue-overdue",
      data: { issueTitle: payload.issueTitle, issueNumber: payload.issueNumber, daysOverdue: payload.daysOverdue, issueUrl: urls.issue(payload.workspaceSlug, payload.issueId) },
    };
  },
};
