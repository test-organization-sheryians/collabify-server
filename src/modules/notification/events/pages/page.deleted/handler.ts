import type { NotificationHandler, Recipient } from "../../types";
import type { Payload } from "./definition";
export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> { return payload.collaboratorIds.map((id) => ({ userId: id, email: null })); },
  async buildInApp(payload) { return { title: `Page deleted: ${payload.pageTitle}`, body: `${payload.actorName} permanently deleted this page.`, actionUrl: "/", entityType: "PAGE", entityId: payload.pageId, actorId: payload.actorId }; },
};
