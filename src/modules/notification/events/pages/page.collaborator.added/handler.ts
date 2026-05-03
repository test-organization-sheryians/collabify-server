import type { NotificationHandler, Recipient } from "../../types";
import type { Payload } from "./definition";
import { urls, pushOf } from "../../_shared/build-helpers";
export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> { return [{ userId: payload.newMemberId, email: null }]; },
  async buildInApp(payload) { return { title: `Added to page: ${payload.pageTitle}`, body: `${payload.actorName} gave you ${payload.accessLevel} access.`, actionUrl: urls.page(payload.workspaceSlug, payload.pageId), entityType: "PAGE", entityId: payload.pageId, actorId: payload.actorId }; },
  async buildPush(payload) { return pushOf(`Page access: ${payload.pageTitle}`, `${payload.actorName} gave you access`, { pageId: payload.pageId }); },
};
