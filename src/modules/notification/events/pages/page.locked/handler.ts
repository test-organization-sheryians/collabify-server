import type { NotificationHandler, Recipient } from "../../types";
import type { Payload } from "./definition";
import { urls } from "../../_shared/build-helpers";
export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> { return payload.collaboratorIds.map((id) => ({ userId: id, email: null })); },
  async buildInApp(payload) { return { title: `Page locked: ${payload.pageTitle}`, body: `${payload.actorName} locked this page for editing.`, actionUrl: urls.page(payload.workspaceSlug, payload.pageId), entityType: "PAGE", entityId: payload.pageId, actorId: payload.actorId }; },
};
