import DataLoader from "dataloader";
import { db } from "@/infra/db";
import { ChatMessage } from "@prisma/client";

export const createLastMessageByChannelIdLoader = () =>
  new DataLoader<string, ChatMessage | null>(async (channelIds) => {
    // Optimization: Use count grouping
    const latestIds = await db.chatMessage.groupBy({
      by: ["conversationId"],
      where: {
        conversationId: { in: [...channelIds] },
        deletedAt: null,
      },
      _max: {
        id: true,
      },
    });

    const messageIds = latestIds
      .map((x) => x._max.id)
      .filter((id): id is string => !!id);

    if (messageIds.length === 0) {
      return channelIds.map(() => null);
    }

    const messages = await db.chatMessage.findMany({
      where: { id: { in: messageIds } },
    });

    const messageMap = new Map(messages.map((m) => [m.conversationId, m]));
    return channelIds.map((id) => messageMap.get(id) || null);
  });
