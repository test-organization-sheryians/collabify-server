import type { NotificationHandler, Recipient, HandlerContext } from "../../types";
import type { Payload } from "./definition";
import { urls, buildRealtimePayload } from "../../_shared/build-helpers";
export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload, ctx: HandlerContext): Promise<Recipient[]> {
    const parentMsg = await ctx.db.chatMessage.findUnique({
      where: { id: payload.parentMessageId },
      select: { authorUserId: true },
    }).catch(() => null);
    if (!parentMsg || parentMsg.authorUserId === payload.actorId) return [];
    return [{ userId: parentMsg.authorUserId, email: null }];
  },
  async shouldDeliver(payload, _r, ctx: HandlerContext): Promise<boolean> {
    const msg = await ctx.db.chatMessage.findUnique({ where: { id: payload.messageId }, select: { deletedAt: true } }).catch(() => null);
    return !msg?.deletedAt;
  },
  async buildInApp(payload) {
    return { title: "New reply", body: payload.contentPreview, actionUrl: urls.conversation(payload.conversationId), entityType: "CONVERSATION", entityId: payload.conversationId, actorId: payload.actorId };
  },
  async buildRealtime(payload) {
    return buildRealtimePayload("chat.message.reply", { conversationId: payload.conversationId, messageId: payload.messageId, parentMessageId: payload.parentMessageId, actorId: payload.actorId, preview: payload.contentPreview });
  },
};
