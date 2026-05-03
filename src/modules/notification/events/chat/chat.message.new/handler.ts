import type { NotificationHandler, Recipient, HandlerContext } from "../../types";
import type { Payload } from "./definition";
import { urls, buildRealtimePayload } from "../../_shared/build-helpers";

export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload, ctx: HandlerContext): Promise<Recipient[]> {
    const members = await ctx.db.chatMember.findMany({
      where: { conversationId: payload.conversationId },
      select: { userId: true },
    });
    return members
      .filter((m) => m.userId !== payload.actorId)
      .map((m) => ({ userId: m.userId, email: null }));
  },

  async shouldDeliver(payload, _r, ctx: HandlerContext): Promise<boolean> {
    const msg = await ctx.db.chatMessage.findUnique({
      where: { id: payload.messageId }, select: { deletedAt: true },
    }).catch(() => null);
    return !msg?.deletedAt;
  },

  async buildInApp(payload, _r, batched?: Payload[]) {
    if (batched && batched.length > 1) {
      return {
        title: `${batched.length} new messages`,
        body: "Multiple new messages",
        actionUrl: urls.conversation(payload.conversationId),
        entityType: "CONVERSATION",
        entityId: payload.conversationId,
        actorId: payload.actorId,
      };
    }
    return {
      title: "New message",
      body: payload.contentPreview,
      actionUrl: urls.conversation(payload.conversationId),
      entityType: "CONVERSATION",
      entityId: payload.conversationId,
      actorId: payload.actorId,
    };
  },

  async buildRealtime(payload) {
    return buildRealtimePayload("chat.message.new", {
      conversationId: payload.conversationId,
      messageId: payload.messageId,
      actorId: payload.actorId,
      preview: payload.contentPreview,
    });
  },
};
