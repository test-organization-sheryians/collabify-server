import DataLoader from "dataloader";
import { db } from "@/infra/db";

export const createMemberCountByChannelIdLoader = () =>
  new DataLoader<string, number>(async (channelIds) => {
    // Optimization: Use count grouping
    const counts = await db.chatMember.groupBy({
      by: ["channelId"],
      where: {
        channelId: { in: [...channelIds] },
        // Assuming we count active members
      },
      _count: {
        userId: true,
      },
    });

    const countMap = new Map(counts.map((c) => [c.channelId, c._count.userId]));
    return channelIds.map((id) => countMap.get(id) || 0);
  });
