import type { NotificationHandler, Recipient } from "../../types";
import type { Payload } from "./definition";
export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> { return payload.collaboratorIds.map((id) => ({ userId: id, email: null })); },
  async buildInApp(payload) { return { title: `Page archived: ${payload.pageTitle}`, body: `${payload.actorName} moved this page to the archive.`, actionUrl: "/", entityType: "PAGE", entityId: payload.pageId, actorId: payload.actorId }; },
};
