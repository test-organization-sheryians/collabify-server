import { GetHistoryInput } from "./types";
import { GetHistoryInputSchema } from "./schema";
import { AppError } from "@/shared/errors";
import { ServiceContext } from "@/graphql/types";

export async function handler(input: GetHistoryInput, ctx: ServiceContext) {
  // 1. Validation
  const { conversationId, beforeSequence, limit } =
    GetHistoryInputSchema.parse(input);

  const fetchLimit = limit ?? 50;

  // 2. Query
  // Fetch limit + 1 to detect hasMore
  const messages = await ctx.db.chatMessage.findMany({
    where: {
      conversationId,
      sequence: {
        lt: beforeSequence,
      },
      deletedAt: null,
    },
    orderBy: {
      sequence: "desc", // Newest first (closest to the gap)
    },
    take: fetchLimit + 1,
    include: {
      // Include any necessary relations?
      // For basic message list, usually just author info if needed, but client might just need IDs
      // Standard ChatMessage type typically maps directly to prisma Message + simple resolvers
    },
  });

  // 3. Logic
  const hasMore = messages.length > fetchLimit;
  const slicedMessages = hasMore ? messages.slice(0, fetchLimit) : messages;

  const minSequence =
    slicedMessages.length > 0
      ? slicedMessages[slicedMessages.length - 1].sequence
      : null;

  // 4. Return
  return {
    messages: slicedMessages, // Logic note: Client might expect them ASC? Resequencer usually handles any order, but DESC is efficient for paging back.
    // If client needs ASC, we can reverse here. But "History" usually implies "going back".
    // Let's keep them DESC (50, 49, 48...) as it matches the standard "cursor-based" approach.
    hasMore,
    minSequence,
  };
}
