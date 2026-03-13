import { Prisma } from "@prisma/client";
import type { ServiceContext } from "@/graphql/types";
import type { GetThreadMessagesInput } from "../schema";

const threadMessageSelect = {
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
} satisfies Prisma.ChatMessageSelect;

export type ThreadMessageRow = Prisma.ChatMessageGetPayload<{
  select: typeof threadMessageSelect;
}>;

/**
 * fetchThreadMessages — fetches replies to a parent message in chronological
 * order (ASC), optionally paginating backwards via a beforeCursor.
 */
export async function fetchThreadMessages(
  input: GetThreadMessagesInput,
  ctx: ServiceContext
): Promise<ThreadMessageRow[]> {
  return ctx.db.chatMessage.findMany({
    where: { parentMessageId: input.parentMessageId },
    take: input.limit,
    skip: input.beforeCursor ? 1 : 0,
    cursor: input.beforeCursor ? { id: input.beforeCursor } : undefined,
    orderBy: { createdAt: "asc" },
    select: threadMessageSelect,
  });
}
