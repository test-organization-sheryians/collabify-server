import DataLoader from "dataloader";
import type { ApplicationContext } from "@/graphql/types";
import { Prisma } from "@prisma/client";

/**
 * Batch load unread message counts for multiple channels
 * Used to resolve the "unread count" across many conversations simultaneously.
 */
export const createUnreadMessageCountLoader = (ctx: ApplicationContext) =>
  new DataLoader<string, number>(async (channelIds) => {
    const userId = ctx.auth?.userId;
    if (!userId) {
      return channelIds.map(() => 0);
    }

    // Use queryRaw for a single O(1) batch query merging members and messages.
    // Handles finding chat messages that exist past the user's specific lastReadSeq.
    const results = await ctx.db.$queryRaw<{ conversationId: string; unreadCount: number }[]>`
      SELECT 
        m."conversation_id" AS "conversationId",
        COUNT(m.id)::int AS "unreadCount"
      FROM "chat_messages" m
      LEFT JOIN "chat_members" mem 
        ON m."conversation_id" = mem."conversation_id" 
        AND mem."user_id" = ${userId}
      WHERE m."conversation_id" IN (${Prisma.join(channelIds as string[])})
        AND m."deleted_at" IS NULL
        AND m.sequence > COALESCE(mem."last_read_seq", 0)
      GROUP BY m."conversation_id"
    `;

    // Map results back to input order
    const countMap = new Map<string, number>(
      results.map((r) => [r.conversationId, r.unreadCount])
    );

    return channelIds.map((id) => countMap.get(id) || 0);
  });
