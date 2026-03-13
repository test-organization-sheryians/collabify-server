import type { ServiceContext } from "@/graphql/types";
import type { ReadReceiptsOutput } from "../schema";
import {
  getUsersWhoRead,
  getMessageReadCount,
} from "@/modules/chat/domain/read-receipts/redis-ops";

/**
 * fetchReadReceipts — Redis-first, DB-watermark fallback.
 *
 * Hot path:  Redis has reader IDs → fetch user profiles → count total members.
 * Cold path: Redis empty → query chatMember.lastReadSeq >= message.sequence from DB.
 *
 * Fixed: fullName || "Unknown" → ?? "Unknown" (nullish, not falsy-collapse).
 */
export async function fetchReadReceipts(
  messageId: string,
  conversationId: string,
  sequence: number,
  ctx: ServiceContext
): Promise<ReadReceiptsOutput> {
  const readCount = await getMessageReadCount(messageId);
  const readerIds = await getUsersWhoRead(conversationId, sequence);

  if (readerIds.length > 0) {
    const [users, totalMembers] = await Promise.all([
      ctx.db.user.findMany({
        where: { id: { in: readerIds } },
        select: { id: true, fullName: true, avatarUrl: true },
      }),
      ctx.db.chatMember.count({ where: { conversationId } }),
    ]);

    return {
      readBy: users.map((u) => ({
        userId: u.id,
        username: u.fullName ?? "Unknown",
        avatarUrl: u.avatarUrl,
      })),
      totalReads: readCount ?? readerIds.length,
      totalMembers,
    };
  }

  // Fallback: DB watermark query for older messages not in Redis
  const [readers, totalMembers] = await Promise.all([
    ctx.db.chatMember.findMany({
      where: {
        conversationId,
        lastReadSeq: { gte: sequence },
      },
      select: {
        user: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    }),
    ctx.db.chatMember.count({ where: { conversationId } }),
  ]);

  return {
    readBy: readers.map((r) => ({
      userId: r.user.id,
      username: r.user.fullName ?? "Unknown",
      avatarUrl: r.user.avatarUrl,
    })),
    totalReads: readers.length,
    totalMembers,
  };
}
