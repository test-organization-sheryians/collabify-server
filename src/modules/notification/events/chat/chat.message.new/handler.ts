import type { NotificationHandler, Recipient, HandlerContext } from "../../types";
import type { Payload } from "./definition";
import { urls, pushOf, buildRealtimePayload } from "../../_shared/build-helpers";

export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> {
    return payload.recipientIds
      .filter((id) => id !== payload.actorId) // never notify sender
      .map((id) => ({ userId: id, email: null }));
  },

  async shouldDeliver(payload, _r, ctx: HandlerContext): Promise<boolean> {
    // Skip if message was deleted before delivery
    const msg = await ctx.db.chatMessage.findUnique({
      where: { id: payload.messageId }, select: { deletedAt: true },
    }).catch(() => null);
    return !msg?.deletedAt;
  },

  async buildInApp(payload, _r, batched) {
    if (batched && batched.length > 1) {
      const actors = [...new Set(batched.map((b) => b.actorName))];
      const convLabel = payload.conversationName ?? "Direct Message";
      return {
        title:      `${batched.length} new messages in ${convLabel}`,
        body:       `From ${actors.slice(0, 2).join(", ")}${actors.length > 2 ? ` and ${actors.length - 2} others` : ""}`,
        actionUrl:  urls.conversation(payload.conversationId),
        entityType: "CONVERSATION",
        entityId:   payload.conversationId,
        actorId:    payload.actorId,
      };
    }
    return {
      title:      payload.conversationName ?? payload.actorName,
      body:       `${payload.actorName}: ${payload.contentPreview}`,
      actionUrl:  urls.conversation(payload.conversationId),
      entityType: "CONVERSATION",
      entityId:   payload.conversationId,
      actorId:    payload.actorId,
    };
  },

  async buildPush(payload, _r, batched) {
    if (batched && batched.length > 1) {
      return pushOf(
        payload.conversationName ?? "New messages",
        `${batched.length} new messages`,
        { conversationId: payload.conversationId }
      );
    }
    return pushOf(
      payload.conversationName ?? payload.actorName,
      `${payload.actorName}: ${payload.contentPreview}`,
      { conversationId: payload.conversationId, messageId: payload.messageId }
    );
  },

  async buildRealtime(payload) {
    return buildRealtimePayload("chat:new_message", {
      conversationId: payload.conversationId,
      messageId:      payload.messageId,
      actorId:        payload.actorId,
      preview:        payload.contentPreview,
    });
  },
};
