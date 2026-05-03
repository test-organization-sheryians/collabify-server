import type { NotificationHandler, Recipient } from "../../types";
import type { Payload } from "./definition";
import { urls, buildRealtimePayload } from "../../_shared/build-helpers";
export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> {
    return payload.recipientIds.filter((id) => id !== payload.actorId).map((id) => ({ userId: id, email: null }));
  },
  async buildInApp(payload) {
    return { title: `${payload.actorName} started a thread`, body: `${payload.conversationName ?? "DM"}: ${payload.contentPreview}`, actionUrl: urls.conversation(payload.conversationId), entityType: "CONVERSATION", entityId: payload.conversationId, actorId: payload.actorId };
  },
  async buildRealtime(payload) {
    return buildRealtimePayload("chat:thread_created", { conversationId: payload.conversationId, threadId: payload.threadId, actorId: payload.actorId });
  },
};
