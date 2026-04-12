import type { NotificationHandler, Recipient } from "../../types";
import type { Payload } from "./definition";
import { urls, buildRealtimePayload } from "../../_shared/build-helpers";
export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> {
    return [{ userId: payload.newMemberId, email: null }];
  },
  async buildInApp(payload) {
    return {
      title: `Added to #${payload.conversationName}`,
      body: `${payload.actorName} added you to this channel.`,
      actionUrl: urls.conversation(payload.conversationId),
      entityType: "CONVERSATION",
      entityId: payload.conversationId,
      actorId: payload.actorId,
    };
  },
  async buildRealtime(payload) {
    return buildRealtimePayload("chat:channel_member_added", {
      conversationId: payload.conversationId,
      memberId: payload.newMemberId,
    });
  },
};
