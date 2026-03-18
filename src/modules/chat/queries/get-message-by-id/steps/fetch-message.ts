import { Prisma } from "@prisma/client";
import type { ServiceContext } from "@/graphql/types";

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
} satisfies Prisma.ChatMessageSelect;

export type MessageByIdRow = Prisma.ChatMessageGetPayload<{
  select: typeof messageSelect;
}>;

/**
 * fetchMessage — fetches the full message row with an explicit select.
 * Called after assertAccess has verified membership — messageId is guaranteed to exist.
 */
export async function fetchMessage(
  messageId: string,
  ctx: ServiceContext
): Promise<MessageByIdRow | null> {
  return ctx.db.chatMessage.findUnique({
    where: { id: messageId },
    select: messageSelect,
  });
}
