import DataLoader from "dataloader";
import { db } from "@/infra/db";
import { ChatChannel } from "@prisma/client";

export const createChannelByIdLoader = () =>
  new DataLoader<string, ChatChannel | null>(async (ids) => {
    const channels = await db.chatChannel.findMany({
      where: {
        id: { in: [...ids] },
      },
    });

    const map = new Map(channels.map((c) => [c.id, c]));
    return ids.map((id) => map.get(id) || null);
  });
