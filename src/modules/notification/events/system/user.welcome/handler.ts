import type { NotificationHandler, Recipient } from "../../types";
import type { Payload } from "./definition";
import { urls, pushOf } from "../../_shared/build-helpers";

export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> {
    return [{ userId: payload.userId, email: payload.userEmail }];
  },

  async buildEmail(payload, recipient) {
    return {
      to:       recipient.email ?? payload.userEmail,
      subject:  `Welcome to Collabify, ${payload.userName}!`,
      template: "welcome",
      data: {
        userName: payload.userName,
        appUrl:   process.env.APP_URL ?? "https://app.collabify.io",
      },
    };
  },

  async buildInApp(payload) {
    return {
      title:      "Welcome to Collabify 🚀",
      body:       `Hi ${payload.userName}, your journey to better collaboration starts here.`,
      actionUrl:  "/onboarding",
      entityType: "USER",
      entityId:   payload.userId,
    };
  },
};
