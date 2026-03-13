import type { ServiceContext } from "@/graphql/types";

/**
 * fetchUnreadCount — counts unread messages for the calling user.
 *
 * `lastReadSeq ?? 0` (not `||`) is intentional: a seq of 0 is valid and means
 * the user has never read anything, so all messages with seq > 0 are unread.
 * Using `||` would incorrectly treat seq=0 as "no value" and start counting from 0.
 *
 * // TODO (Architecture): this aggregation runs on every getConversation fetch.
 * // For read-heavy workloads, consider caching the unread count in Redis and
 * // invalidating on new message / markRead events instead of counting on each request.
 */
export async function fetchUnreadCount(
  conversationId: string,
  lastReadSeq: number | null,
  ctx: ServiceContext
): Promise<number> {
  return ctx.db.chatMessage.count({
    where: {
      conversationId,
      sequence: { gt: lastReadSeq ?? 0 },
      deletedAt: null,
    },
  });
}
