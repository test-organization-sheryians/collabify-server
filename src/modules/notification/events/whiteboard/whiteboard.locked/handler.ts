import type { NotificationHandler, Recipient } from "../../types";
import type { Payload } from "./definition";
import { urls } from "../../_shared/build-helpers";
export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> { return payload.collaboratorIds.map((id) => ({ userId: id, email: null })); },
  async buildInApp(payload) { return { title: `Whiteboard locked: ${payload.whiteboardName}`, body: `${payload.actorName} locked this whiteboard.`, actionUrl: urls.whiteboard(payload.workspaceSlug, payload.whiteboardId), entityType: "WHITEBOARD", entityId: payload.whiteboardId, actorId: payload.actorId }; },
};
