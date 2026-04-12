import type { NotificationHandler, Recipient } from "../../types";
import type { Payload } from "./definition";
import { urls, pushOf, buildRealtimePayload } from "../../_shared/build-helpers";
export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> { return [{ userId: payload.recipientId, email: null }]; },
  async buildInApp(payload) { return { title: `New message from ${payload.actorName}`, body: payload.firstMessagePreview, actionUrl: urls.conversation(payload.conversationId), entityType: "CONVERSATION", entityId: payload.conversationId, actorId: payload.actorId }; },
  async buildPush(payload) { return pushOf(`${payload.actorName}`, payload.firstMessagePreview, { conversationId: payload.conversationId }); },
  async buildRealtime(payload) { return buildRealtimePayload("chat:dm_created", { conversationId: payload.conversationId, actorId: payload.actorId }); },
};
