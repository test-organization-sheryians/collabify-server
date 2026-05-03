import type { NotificationHandler, Recipient } from "../../types";
import type { Payload } from "./definition";
export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> { return [{ userId: payload.removedUserId, email: null }]; },
  async buildInApp(payload) { return { title: `Removed from whiteboard: ${payload.whiteboardName}`, body: `${payload.actorName} removed your access.`, actionUrl: "/", entityType: "WHITEBOARD", entityId: payload.whiteboardId, actorId: payload.actorId }; },
};
