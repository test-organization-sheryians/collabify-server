import type { NotificationHandler, Recipient } from "../../types";
import type { Payload } from "./definition";
import { urls, buildRealtimePayload } from "../../_shared/build-helpers";
export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> {
    if (payload.messageAuthorId === payload.actorId) return []; // no self-reaction notify
    return [{ userId: payload.messageAuthorId, email: null }];
  },
  async buildInApp(payload, _r, batched) {
    if (batched && batched.length > 1) {
      const emojis = [...new Set(batched.map((b) => b.emoji))].slice(0, 3).join(" ");
      const actors = [...new Set(batched.map((b) => b.actorName))];
      return { title: `${actors.length} person${actors.length > 1 ? "s" : ""} reacted ${emojis}`, body: `to your message in ${payload.conversationName ?? "a DM"}`, actionUrl: urls.conversation(payload.conversationId), entityType: "CONVERSATION", entityId: payload.conversationId, actorId: payload.actorId };
    }
    return { title: `${payload.actorName} reacted ${payload.emoji}`, body: `to your message in ${payload.conversationName ?? "a DM"}`, actionUrl: urls.conversation(payload.conversationId), entityType: "CONVERSATION", entityId: payload.conversationId, actorId: payload.actorId };
  },
  async buildRealtime(payload) { return buildRealtimePayload("chat:reaction_added", { conversationId: payload.conversationId, messageId: payload.messageId, emoji: payload.emoji, actorId: payload.actorId }); },
};
