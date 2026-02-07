import type { ServiceContext } from "@/graphql/types";
import type { GetUnreadCountsInput, GetUnreadCountsOutput } from "./schema";

export const handler = async (
  input: GetUnreadCountsInput,
  ctx: ServiceContext
): Promise<GetUnreadCountsOutput> => {
  const { workspaceId, projectId } = input;
  const userId = ctx.auth.userId!;

  // 1. Get user's conversations with sequences
  const members = await ctx.db.chatMember.findMany({
    where: {
      userId,
      conversation: {
        workspaceId,
        projectId,
        deletedAt: null,
      },
    },
    select: {
      conversationId: true,
      lastReadSeq: true,
      conversation: {
        select: {
          lastSequence: true,
        },
      },
    },
  });

  // 2. Batch fetch read watermarks from Redis (single pipeline)
  const pipeline = ctx.redis.pipeline();

  members.forEach((member) => {
    pipeline.zscore(`read:${member.conversationId}`, userId);
  });

  const results = await pipeline.exec();

  // 3. Calculate unread counts
  const conversations = members.map((member, index) => {
    const userReadSeq = results?.[index]?.[1]
      ? parseInt(results[index][1] as string)
      : member.lastReadSeq || 0;

    const lastMsgSeq = member.conversation.lastSequence || 0;
    const unreadCount = Math.max(0, lastMsgSeq - userReadSeq);

    return {
      conversationId: member.conversationId,
      unreadCount,
      lastUnreadMessageId: null, // Not tracked in current schema
    };
  });

  return { conversations };
};
