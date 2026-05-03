import type { NotificationHandler, Recipient } from "../../types";
import type { Payload } from "./definition";

const LIMIT_LABELS: Record<string, string> = {
  members:   "team members",
  storage:   "storage",
  projects:  "projects",
  api_calls: "API calls",
};

export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> {
    return [{ userId: payload.ownerId, email: null }];
  },

  async buildInApp(payload) {
    const label = LIMIT_LABELS[payload.limitType] ?? payload.limitType;
    const critical = payload.usagePct >= 100;
    return {
      title:      critical ? `Plan limit reached — ${label}` : `Approaching ${label} limit (${Math.round(payload.usagePct)}%)`,
      body:       `${payload.workspaceName} has used ${payload.currentUsage} of ${payload.limit} ${label}. Upgrade to continue scaling.`,
      actionUrl:  payload.upgradeUrl,
      entityType: "WORKSPACE",
      entityId:   payload.workspaceId,
    };
  },

  async buildEmail(payload) {
    const label = LIMIT_LABELS[payload.limitType] ?? payload.limitType;
    return {
      to:       payload.upgradeUrl, // worker resolves real email from user record
      subject:  `Your workspace is at ${Math.round(payload.usagePct)}% of its ${label} limit`,
      template: "plan-limit",
      data: {
        workspaceName: payload.workspaceName,
        limitType:     label,
        currentUsage:  payload.currentUsage,
        limit:         payload.limit,
        usagePct:      payload.usagePct,
        upgradeUrl:    payload.upgradeUrl,
      },
    };
  },
};
