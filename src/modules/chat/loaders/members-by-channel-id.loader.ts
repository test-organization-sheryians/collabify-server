import DataLoader from "dataloader";
import { db } from "@/infra/db";
import { ChatMember } from "@prisma/client";

export const createMembersByChannelIdLoader = () =>
  new DataLoader<string, ChatMember[]>(async (channelIds) => {
    const HARD_LIMIT_PER_CHANNEL = 50;

    const results = await Promise.all(
      channelIds.map(async (id) => {
        return db.chatMember.findMany({
          where: { conversationId: id },
          take: HARD_LIMIT_PER_CHANNEL,
          orderBy: { joinedAt: "asc" }, // Predictable order
        });
      })
    );

    return results;
  });
