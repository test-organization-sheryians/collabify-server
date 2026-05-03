import type { NotificationHandler, Recipient } from "../../types";
import type { Payload } from "./definition";
import { urls } from "../../_shared/build-helpers";

export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> {
    return [{ userId: payload.ownerId, email: null }];
  },

  async buildEmail(payload) {
    const urgency = payload.daysLeft <= 3 ? "⚠️ Urgent:" : "";
    return {
      to:       payload.billingUrl, // resolved by email worker from user record
      subject:  `${urgency} Your ${payload.planName} plan expires in ${payload.daysLeft} day${payload.daysLeft === 1 ? "" : "s"}`,
      template: "subscription-expiring",
      data: {
        workspaceName: payload.workspaceName,
        planName:      payload.planName,
        daysLeft:      payload.daysLeft,
        expiresAt:     payload.expiresAt,
        billingUrl:    payload.billingUrl,
      },
    };
  },

  async buildInApp(payload) {
    return {
      title:      `Subscription expiring in ${payload.daysLeft} day${payload.daysLeft === 1 ? "" : "s"}`,
      body:       `Your ${payload.planName} plan for ${payload.workspaceName} expires soon. Renew to avoid disruption.`,
      actionUrl:  payload.billingUrl,
      entityType: "WORKSPACE",
      entityId:   payload.workspaceId,
    };
  },
};
