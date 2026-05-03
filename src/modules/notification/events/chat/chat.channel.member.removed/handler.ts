import type { NotificationHandler, Recipient } from "../../types";
import type { Payload } from "./definition";
import { buildRealtimePayload } from "../../_shared/build-helpers";
export const handler: NotificationHandler<Payload> = {
  async resolveRecipients(payload): Promise<Recipient[]> {
    return [{ userId: payload.removedUserId, email: null }];
  },
  async buildInApp(payload) {
    return {
      title: `Removed from #${payload.conversationName}`,
      body: `${payload.actorName} removed you from this channel.`,
      actionUrl: "/",
      entityType: "CONVERSATION",
      entityId: payload.conversationId,
      actorId: payload.actorId,
    };
  },
  async buildRealtime(payload) {
    return buildRealtimePayload("chat.channel.member.removed", {
      conversationId: payload.conversationId,
      conversationName: payload.conversationName,
      workspaceId: payload.workspaceId,
      workspaceSlug: payload.workspaceSlug,
      removedUserId: payload.removedUserId,
      actorId: payload.actorId,
      actorName: payload.actorName,
    });
  },
};
