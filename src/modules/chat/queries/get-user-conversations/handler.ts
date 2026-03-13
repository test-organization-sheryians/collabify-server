import { createLogger } from "@/shared/lib/logger";
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { GetUserConversationsInput, GetUserConversationsOutput } from "./schema";
import { ConversationType } from "@/graphql/generated";
import type { Conversation } from "@/graphql/generated";
import { assertAccess } from "./steps/assert-access";
import { fetchConversations } from "./steps/fetch-conversations";

const log = createLogger("chat:queries:get-user-conversations");

/**
 * getUserConversations — fetches all conversations the user is a member of,
 * with filtering, pagination, and per-conversation metadata (unread count, last message).
 *
 * Steps:
 *  1. assertAccess       — workspace or project-scoped auth gate (bug fixed: no longer
 *                          silently uses user-supplied workspaceId when getProject returns null)
 *  2. fetchConversations — DB findMany with explicit select (limit+1 look-ahead)
 *  3. metadata loop      — per-conversation: chatMember findUnique + chatMessage count + findFirst
 *
 * TODO: Step 3 is O(N×3) queries. Future optimization: batch via dataloaders.
 *
 * @throws AppError 401  if not authenticated
 * @throws AppError 403  if not a workspace/project member or lacks conversation:read
 */
export const handler = async (
  input: GetUserConversationsInput,
  ctx: ServiceContext
): Promise<GetUserConversationsOutput> => {
  const userId = ctx.auth.userId;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    await assertAccess(input.workspaceId, input.projectId, ctx);

    const limit = input.limit ?? 50;
    const conversations = await fetchConversations(input, userId, ctx);

    const hasNextPage = conversations.length > limit;
    const edges = hasNextPage ? conversations.slice(0, limit) : conversations;

    // Per-conversation metadata fetch (N×3 queries — see TODO above)
    const conversationsWithMetadata = await Promise.all(
      edges.map(async (conv): Promise<Conversation> => {
        const member = await ctx.db.chatMember.findUnique({
          where: {
            conversationId_userId: { conversationId: conv.id, userId },
          },
        });

        const [unreadCount, lastMessage] = await Promise.all([
          ctx.db.chatMessage.count({
            where: {
              conversationId: conv.id,
              sequence: { gt: member?.lastReadSeq ?? 0 },
              deletedAt: null,
            },
          }),
          ctx.db.chatMessage.findFirst({
            where: { conversationId: conv.id, deletedAt: null },
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              content: true,
              authorUserId: true,
              createdAt: true,
            },
          }),
        ]);

        return {
          id: conv.id,
          type: conv.type as ConversationType,
          name: conv.name,
          topic: conv.topic,
          isPublic: conv.type === "CHANNEL" && !conv.name?.startsWith("#private-"),
          workspaceId: conv.workspaceId,
          projectId: conv.projectId,
          parentMessageId: conv.parentMessageId,
          createdBy: null,
          isArchived: conv.isArchived,
          memberCount: conv.members.length,
          unreadCount,
          members: [],
          lastMessage: lastMessage || null,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          deletedAt: conv.deletedAt,
        };
      })
    );

    return {
      edges: conversationsWithMetadata,
      pageInfo: {
        hasNextPage,
        endCursor: hasNextPage
          ? edges[edges.length - 1]!.updatedAt.toISOString()
          : null,
      },
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    log.error("[get-user-conversations] Unexpected failure", {
      err,
      workspaceId: input.workspaceId,
    });
    throw err;
  }
};
