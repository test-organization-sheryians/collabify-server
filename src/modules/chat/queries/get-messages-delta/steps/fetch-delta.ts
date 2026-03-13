import { Prisma } from "@prisma/client";
import type { ServiceContext } from "@/graphql/types";
import type { GetMessagesDeltaInput } from "../schema";

const deltaMessageSelect = {
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

export type DeltaMessageRow = Prisma.ChatMessageGetPayload<{
  select: typeof deltaMessageSelect;
}>;

/**
 * fetchDelta — fetches messages after a sequence cursor for sync recovery.
 * Returns limit+1 rows so the caller can detect hasMore.
 * Ordered ASC by sequence for correct client-side application order.
 *
 * Fallback to sequence > 0 for legacy clients without an afterSequence cursor.
 * Fixed: lastMsg?.sequence || afterSequence → ?? (nullish coalescing)
 */
export async function fetchDelta(
  input: GetMessagesDeltaInput,
  ctx: ServiceContext
): Promise<DeltaMessageRow[]> {
  const limit = input.limit ?? 50;
  const afterSeq = input.afterSequence ?? 0;

  return ctx.db.chatMessage.findMany({
    where: {
      conversationId: input.conversationId,
      sequence: { gt: afterSeq },
    },
    orderBy: { sequence: "asc" },
    take: limit + 1,
    select: deltaMessageSelect,
  });
}
