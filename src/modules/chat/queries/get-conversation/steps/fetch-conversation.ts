import { Prisma } from "@prisma/client";
import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";

// Select const lives here — next to the query that uses it.
// ConversationRow derives from it via GetPayload so they can never drift.
const conversationSelect = {
  id: true,
  type: true,
  name: true,
  topic: true,
  isArchived: true,
  workspaceId: true,
  projectId: true,
  parentMessageId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  members: {
    select: {
      userId: true,
      role: true,
      isMuted: true,
      joinedAt: true,
      lastReadSeq: true,
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  },
} satisfies Prisma.ChatConversationSelect;

export type ConversationRow = Prisma.ChatConversationGetPayload<{
  select: typeof conversationSelect;
}>;

// Derived from ConversationRow — updating the select above propagates here automatically.
export type MemberRow = ConversationRow["members"][number];
export type MemberUserRow = MemberRow["user"];

/**
 * fetchConversation — single DB read for a conversation with its full member list.
 *
 * No `members.some({ userId })` filter: membership is already Redis-verified by
 * assertAccess. The extra DB predicate is redundant and adds latency.
 *
 * Archived conversations are included deliberately — callers need them for the
 * settings modal and conversation history views.
 *
 * // TODO (Architecture): for channels with 1000+ members, this loads the entire
 * // member list in one query. Consider moving `members` to a dedicated paginated
 * // resolver field (e.g., `getChannelMembers`) and removing it from this response.
 *
 * @throws AppError 404  if conversation row is missing (unexpected after authGate pass)
 */
export async function fetchConversation(
  conversationId: string,
  ctx: ServiceContext
): Promise<ConversationRow> {
  const conversation = await ctx.db.chatConversation.findFirst({
    where: { id: conversationId },
    select: conversationSelect,
  });

  if (!conversation) {
    throw AppError.notFound("Conversation not found");
  }

  return conversation;
}
