import type { NotificationHandler, Recipient } from "../../types";
import type { Payload } from "./definition";
import { urls, pushOf, buildRealtimePayload } from "../../_shared/build-helpers";
export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> {
    return payload.threadParticipantIds.filter((id) => id !== payload.actorId).map((id) => ({ userId: id, email: null }));
  },
  async buildInApp(payload, _r, batched) {
    if (batched && batched.length > 1) {
      return { title: `${batched.length} new thread replies`, body: `In ${payload.conversationName ?? "Direct Message"}`, actionUrl: urls.conversation(payload.conversationId), entityType: "CONVERSATION", entityId: payload.conversationId, actorId: payload.actorId };
    }
    return { title: `${payload.actorName} replied in a thread`, body: payload.contentPreview, actionUrl: urls.conversation(payload.conversationId), entityType: "CONVERSATION", entityId: payload.conversationId, actorId: payload.actorId };
  },
  async buildPush(payload) {
    return pushOf(`${payload.actorName} replied in thread`, payload.contentPreview, { conversationId: payload.conversationId });
  },
  async buildRealtime(payload) {
    return buildRealtimePayload("chat:thread_reply", { conversationId: payload.conversationId, threadId: payload.threadId, messageId: payload.messageId, actorId: payload.actorId });
  },
};
