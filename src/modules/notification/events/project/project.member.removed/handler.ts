import type { NotificationHandler, Recipient } from "../../types";
import type { Payload } from "./definition";

export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> {
    return [{ userId: payload.removedUserId, email: null }];
  },
  async buildInApp(payload) {
    return {
      title:      `You were removed from ${payload.projectName}`,
      body:       `${payload.actorName} removed you from the project.`,
      actionUrl:  "/",
      entityType: "PROJECT",
      entityId:   payload.projectId,
      actorId:    payload.actorId,
    };
  },
};
