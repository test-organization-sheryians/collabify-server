import type { NotificationHandler, Recipient, HandlerContext } from "../../types";
import type { Payload } from "./definition";
import { urls, pushOf, buildRealtimePayload } from "../../_shared/build-helpers";
export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> {
    if (payload.parentAuthorId === payload.actorId) return []; // no self-notify
    return [{ userId: payload.parentAuthorId, email: null }];
  },
  async shouldDeliver(payload, _r, ctx: HandlerContext): Promise<boolean> {
    const msg = await ctx.db.chatMessage.findUnique({ where: { id: payload.messageId }, select: { deletedAt: true } }).catch(() => null);
    return !msg?.deletedAt;
  },
  async buildInApp(payload) {
    return { title: `${payload.actorName} replied to your message`, body: payload.contentPreview, actionUrl: urls.conversation(payload.conversationId), entityType: "CONVERSATION", entityId: payload.conversationId, actorId: payload.actorId };
  },
  async buildPush(payload) {
    return pushOf(`${payload.actorName} replied`, payload.contentPreview, { conversationId: payload.conversationId, messageId: payload.messageId });
  },
  async buildRealtime(payload) {
    return buildRealtimePayload("chat:reply", { conversationId: payload.conversationId, messageId: payload.messageId, parentMessageId: payload.parentMessageId, actorId: payload.actorId });
  },
};
