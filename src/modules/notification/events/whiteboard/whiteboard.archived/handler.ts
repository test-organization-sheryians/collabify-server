import type { NotificationHandler, Recipient } from "../../types";
import type { Payload } from "./definition";
export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> { return payload.collaboratorIds.map((id) => ({ userId: id, email: null })); },
  async buildInApp(payload) { return { title: `Whiteboard archived: ${payload.whiteboardName}`, body: `${payload.actorName} archived this whiteboard.`, actionUrl: "/", entityType: "WHITEBOARD", entityId: payload.whiteboardId, actorId: payload.actorId }; },
};
