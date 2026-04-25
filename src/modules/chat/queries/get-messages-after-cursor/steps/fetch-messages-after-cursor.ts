import { Prisma } from "@prisma/client";
import type { ServiceContext } from "@/graphql/types";
import type { GetMessagesAfterCursorInput } from "../schema";

const messageSelect = {
  id: true,
  conversationId: true,
  authorUserId: true,
  content: true,
  type: true,
  sequence: true,
  streamId: true,
  createdAt: true,
  deletedAt: true,
  metadata: true,
  parentMessageId: true,
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

export type MessageAfterCursorRow = Prisma.ChatMessageGetPayload<{
  select: typeof messageSelect;
}>;

/**
 * fetchMessagesAfterCursor — fetches messages after a cursor (exclusive) in
 * chronological order (ASC) for gap-fill / forward sync.
 */
export async function fetchMessagesAfterCursor(
  input: GetMessagesAfterCursorInput,
  ctx: ServiceContext
): Promise<MessageAfterCursorRow[]> {
  return ctx.db.chatMessage.findMany({
    where: { conversationId: input.channelId },
    take: input.limit,
    skip: 1,
    cursor: { id: input.afterCursor },
    orderBy: { createdAt: "asc" },
    select: messageSelect,
  });
}
