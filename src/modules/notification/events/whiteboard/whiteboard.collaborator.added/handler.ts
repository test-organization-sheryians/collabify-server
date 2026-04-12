import type { NotificationHandler, Recipient } from "../../types";
import type { Payload } from "./definition";
import { urls, pushOf } from "../../_shared/build-helpers";
export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> { return [{ userId: payload.newMemberId, email: null }]; },
  async buildInApp(payload) { return { title: `Added to whiteboard: ${payload.whiteboardName}`, body: `${payload.actorName} gave you ${payload.accessLevel} access.`, actionUrl: urls.whiteboard(payload.workspaceSlug, payload.whiteboardId), entityType: "WHITEBOARD", entityId: payload.whiteboardId, actorId: payload.actorId }; },
  async buildPush(payload) { return pushOf(`Whiteboard access`, `${payload.actorName} added you to ${payload.whiteboardName}`, { whiteboardId: payload.whiteboardId }); },
};
