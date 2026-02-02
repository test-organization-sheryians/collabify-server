import DataLoader from "dataloader";
import type { ApplicationContext } from "@/graphql/types";

/**
 * Batch load reply counts for multiple messages
 * Prevents N+1 queries when fetching message lists
 */
export const createReplyCountByMessageIdLoader = (ctx: ApplicationContext) =>
  new DataLoader<string, number>(async (messageIds) => {
    // Group by parentMessageId and count
    const results = await ctx.db.chatMessage.groupBy({
      by: ["parentMessageId"],
      where: {
        parentMessageId: { in: messageIds as string[] },
        deletedAt: null,
      },
      _count: { id: true },
    });

    // Create map of messageId -> count
    const countMap = new Map<string, number>(
      results.map(
        (r: { parentMessageId: string | null; _count: { id: number } }) => [
          r.parentMessageId!,
          r._count.id,
        ]
      )
    );

    // Return counts in same order as input (0 if no replies)
    return messageIds.map((id) => countMap.get(id) || 0);
  });
