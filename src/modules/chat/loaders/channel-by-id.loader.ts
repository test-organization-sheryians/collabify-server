import DataLoader from "dataloader";
import { db } from "@/infra/db";
import { ChatConversation } from "@prisma/client";

export const createChannelByIdLoader = () =>
  new DataLoader<string, ChatConversation | null>(async (ids) => {
    const channels = await db.chatConversation.findMany({
      where: {
        id: { in: [...ids] },
        type: "CHANNEL",
      },
    });

    const map = new Map(channels.map((c) => [c.id, c]));
    return ids.map((id) => map.get(id) || null);
  });
