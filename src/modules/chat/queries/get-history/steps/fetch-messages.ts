import { Prisma } from "@prisma/client";
import type { ServiceContext } from "@/graphql/types";

// Select const lives here — next to the query that uses it.
// MessageRow derives from it via GetPayload so the type can never drift.
const messageSelect = {
  id: true,
  conversationId: true,
  authorUserId: true,
  content: true,
  sequence: true,
  type: true,
  streamId: true,
  createdAt: true,
  parentMessageId: true,
  metadata: true,
  deletedAt: true,
  // Eager load mentions for rich content reconstruction
  mentions: {
    select: {
      id: true,
      targetEntityId: true,
      targetEntityType: true,
      displayText: true,
    },
    orderBy: { id: 'asc' },
  },
} satisfies Prisma.ChatMessageSelect;

export type MessageRow = Prisma.ChatMessageGetPayload<{
  select: typeof messageSelect;
}>;

/**
 * fetchMessages — paginated history fetch for a conversation.
 *
 * Fetches limit+1 rows to allow the caller to detect whether more pages exist
 * without a separate COUNT query. The extra row is sliced off in build-response.
 *
 * Ordered by sequence DESC so the most recent messages before the cursor come
 * first — consistent with "scroll back" pagination semantics.
 *
 * Soft-deleted messages (deletedAt != null) are excluded from history.
 *
 * @param limit — already resolved (defaults applied in handler)
 */
export async function fetchMessages(
  conversationId: string,
  beforeSequence: number,
  limit: number,
  ctx: ServiceContext
): Promise<MessageRow[]> {
  return ctx.db.chatMessage.findMany({
    where: {
      conversationId,
      sequence: { lt: beforeSequence },
      deletedAt: null,
    },
    orderBy: { sequence: "desc" },
    take: limit + 1,
    select: messageSelect,
  });
}
