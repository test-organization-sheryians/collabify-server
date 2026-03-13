import { Prisma } from "@prisma/client";
import type { ServiceContext } from "@/graphql/types";
import type { GetMissingMessagesInput } from "../schema";

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
} satisfies Prisma.ChatMessageSelect;

export type MissingMessageRow = Prisma.ChatMessageGetPayload<{
  select: typeof messageSelect;
}>;

/**
 * fetchMissingMessages — fetches messages within a ULID range (inclusive) for
 * offline gap recovery. ULIDs are lexicographically ordered, so string gte/lte
 * is equivalent to chronological range queries.
 */
export async function fetchMissingMessages(
  input: GetMissingMessagesInput,
  ctx: ServiceContext
): Promise<MissingMessageRow[]> {
  return ctx.db.chatMessage.findMany({
    where: {
      conversationId: input.channelId,
      id: { gte: input.rangeStart, lte: input.rangeEnd },
    },
    orderBy: { id: "asc" },
    select: messageSelect,
  });
}
