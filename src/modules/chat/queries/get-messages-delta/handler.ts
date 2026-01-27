import { ServiceContext } from "@/graphql/types";
import type { GetMessagesDeltaInput } from "./types";

export const handler = async (
  input: GetMessagesDeltaInput,
  ctx: ServiceContext
) => {
  // ARCHITECTURE: Dual-Sequencing Recovery
  // We prioritize the strictly monotonic `sequence` number for gap detection.
  // This guarantees O(1) complexity for finding missing ranges.

  const { conversationId, afterSequence, limit } = input;

  // 1. Fetch Delta
  const messages = await ctx.db.chatMessage.findMany({
    where: {
      conversationId,
      // ARCHITECTURE: Cursor Strategy
      // If `afterSequence` is present, we are in "Version 2" (Strict Sequencing).
      // Fallback: Default to 0 (Start of history) for legacy clients.
      ...(afterSequence !== undefined
        ? { sequence: { gt: afterSequence } }
        : { sequence: { gt: 0 } }),
    },
    orderBy: {
      sequence: "asc",
    },
    take: limit! + 1, // Look-ahead for pagination
  });

  // 2. Pagination Logic
  const hasMore = messages.length > limit!;
  if (hasMore) {
    messages.pop(); // Remove the extra item
  }

  const lastMsg = messages[messages.length - 1];
  const lastSequence = lastMsg?.sequence || afterSequence || 0;

  return {
    messages,
    hasMore,
    lastSequence,
  };
};
