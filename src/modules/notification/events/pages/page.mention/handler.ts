import type { NotificationHandler, Recipient } from "../../types";
import type { Payload } from "./definition";
import { urls, pushOf } from "../../_shared/build-helpers";
export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> { return [{ userId: payload.mentionedUserId, email: null }]; },
  async buildInApp(payload) { return { title: `${payload.actorName} mentioned you in a page`, body: payload.pageTitle + (payload.contextSnippet ? `: "${payload.contextSnippet}"` : ""), actionUrl: urls.page(payload.workspaceSlug, payload.pageId), entityType: "PAGE", entityId: payload.pageId, actorId: payload.actorId }; },
  async buildPush(payload) { return pushOf(`${payload.actorName} mentioned you`, payload.pageTitle, { pageId: payload.pageId }); },
};
