import type { NotificationHandler, Recipient, HandlerContext } from "../../types";
import type { Payload } from "./definition";
import { urls, buildRealtimePayload } from "../../_shared/build-helpers";
export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> {
    return [{ userId: payload.mentionedUserId, email: null }];
  },
  async shouldDeliver(payload, _r, ctx: HandlerContext): Promise<boolean> {
    const msg = await ctx.db.chatMessage.findUnique({ where: { id: payload.messageId }, select: { deletedAt: true } }).catch(() => null);
    return !msg?.deletedAt;
  },
  async buildInApp(payload) {
    return { title: "You were mentioned", body: payload.contentPreview, actionUrl: urls.conversation(payload.conversationId), entityType: "CONVERSATION", entityId: payload.conversationId, actorId: payload.actorId };
  },
  async buildRealtime(payload) {
    return buildRealtimePayload("chat.message.mention", { conversationId: payload.conversationId, messageId: payload.messageId, actorId: payload.actorId });
  },
};
