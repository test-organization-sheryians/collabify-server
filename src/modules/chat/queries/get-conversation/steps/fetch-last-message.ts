import { Prisma } from "@prisma/client";
import type { ServiceContext } from "@/graphql/types";

// Select const lives here — next to the query that uses it.
// LastMessageRow derives from it via GetPayload so they can never drift.
const lastMessageSelect = {
  id: true,
  content: true,
  authorUserId: true,
  createdAt: true,
} satisfies Prisma.ChatMessageSelect;

export type LastMessageRow = Prisma.ChatMessageGetPayload<{
  select: typeof lastMessageSelect;
}>;

/**
 * fetchLastMessage — fetches the most recent non-deleted message for the preview field.
 *
 * Returns null if the conversation has no messages yet.
 *
 * `content` is typed as Prisma.JsonValue because the DB column is JSON.
 * // FIXME: if content is always a plain string in practice, migrate the column to Text
 * // to get a strongly-typed string and remove this constraint.
 */
export async function fetchLastMessage(
  conversationId: string,
  ctx: ServiceContext
): Promise<LastMessageRow | null> {
  return ctx.db.chatMessage.findFirst({
    where: {
      conversationId,
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: lastMessageSelect,
  });
}
