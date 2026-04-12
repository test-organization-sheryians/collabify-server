import type { NotificationHandler, Recipient, HandlerContext } from "../../types";
import type { Payload } from "./definition";
import { urls, pushOf, buildRealtimePayload } from "../../_shared/build-helpers";
export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> {
    return [{ userId: payload.mentionedUserId, email: null }];
  },
  async shouldDeliver(payload, _r, ctx: HandlerContext): Promise<boolean> {
    const msg = await ctx.db.chatMessage.findUnique({ where: { id: payload.messageId }, select: { deletedAt: true } }).catch(() => null);
    return !msg?.deletedAt;
  },
  async buildInApp(payload) {
    return { title: `${payload.actorName} mentioned you`, body: `${payload.conversationName ?? "DM"}: ${payload.contentPreview}`, actionUrl: urls.conversation(payload.conversationId), entityType: "CONVERSATION", entityId: payload.conversationId, actorId: payload.actorId };
  },
  async buildPush(payload) {
    return pushOf(`${payload.actorName} mentioned you`, `${payload.conversationName ?? "DM"}: ${payload.contentPreview}`, { conversationId: payload.conversationId, messageId: payload.messageId });
  },
  async buildEmail(payload) {
    return { to: "", subject: `${payload.actorName} mentioned you in ${payload.conversationName ?? "a Direct Message"}`, template: "chat-mention", data: { actorName: payload.actorName, conversationName: payload.conversationName, contentPreview: payload.contentPreview, conversationUrl: urls.conversation(payload.conversationId) } };
  },
  async buildRealtime(payload) {
    return buildRealtimePayload("chat:mention", { conversationId: payload.conversationId, messageId: payload.messageId, actorId: payload.actorId });
  },
};
