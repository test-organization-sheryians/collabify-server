import { Prisma } from "@prisma/client";
import type { ServiceContext } from "@/graphql/types";
import type { GetUserConversationsInput } from "../schema";

const conversationSelect = {
  id: true,
  type: true,
  name: true,
  topic: true,
  isPublic: true,
  workspaceId: true,
  projectId: true,
  parentMessageId: true,
  isArchived: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  members: { select: { userId: true } },
} satisfies Prisma.ChatConversationSelect;

export type ConversationRow = Prisma.ChatConversationGetPayload<{
  select: typeof conversationSelect;
}>;

/**
 * fetchConversations — queries conversations the user is a member of,
 * with cursor-based pagination (updatedAt DESC).
 * Returns limit+1 rows to detect hasNextPage without COUNT.
 *
 * TODO: The metadata fetch per conversation (unreadCount + lastMessage) causes
 * N×3 DB queries for large lists. Future optimization: batch with dataloaders.
 */
export async function fetchConversations(
  input: GetUserConversationsInput,
  userId: string,
  ctx: ServiceContext
): Promise<ConversationRow[]> {
  const limit = input.limit ?? 50;

  const where: Prisma.ChatConversationWhereInput = {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    members: { some: { userId } },
    type: input.type
      ? (input.type as any)
      : { in: ["CHANNEL", "DM", "GROUP_DM"] },
    ...(input.includeArchived ? {} : { isArchived: false }),
    ...(input.cursor ? { updatedAt: { lt: new Date(input.cursor) } } : {}),
  };

  return ctx.db.chatConversation.findMany({
    where,
    take: limit + 1,
    orderBy: { updatedAt: "desc" },
    select: conversationSelect,
  });
}
