import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { getUserConversationsSchema } from "./schema";
import type {
  GetUserConversationsInput,
  GetUserConversationsOutput,
  ConversationEdge,
} from "./types";
import type { Prisma } from "@prisma/client";
import { ConversationType } from "@/graphql/generated";

/**
 * Get User Conversations Handler
 *
 * Unified query for fetching all conversation types with filtering and pagination.
 * Replaces: getDmConversations, getGroupConversations, getUserChannels
 */
export const handler = async (
  input: GetUserConversationsInput,
  ctx: ServiceContext
): Promise<GetUserConversationsOutput> => {
  const { userId } = ctx.auth;
  if (!userId) {
    throw AppError.unauthorized("User not authenticated");
  }

  // Validate and parse input
  const {
    workspaceId,
    projectId,
    type,
    includeArchived = false,
    limit = 50,
    cursor,
  } = getUserConversationsSchema.parse(input);

  // ──────────────────────────────────────────────────────────────────────────
  // Build query with filters
  // ──────────────────────────────────────────────────────────────────────────

  const where: Prisma.ChatConversationWhereInput = {
    workspaceId,
    projectId,
    members: {
      some: { userId },
    },
  };

  // Filter by type (CHANNEL, DM, or GROUP_DM)
  // THREAD is excluded from this query - handled separately
  if (type) {
    where.type = type as any;
  } else {
    // Default: exclude threads even though schema doesn't allow it
    // This is defensive programming in case schema changes
    where.type = { in: ["CHANNEL", "DM", "GROUP_DM"] };
  }

  // Filter archived
  if (!includeArchived) {
    where.deletedAt = null;
  }

  // Cursor-based pagination
  if (cursor) {
    where.updatedAt = {
      lt: new Date(cursor),
    };
  }

  // Fetch conversations (limit + 1 for hasNextPage check)
  const conversations = await ctx.db.chatConversation.findMany({
    where,
    take: limit + 1,
    orderBy: {
      updatedAt: "desc", // Most recently updated first
    },
    include: {
      members: {
        select: { userId: true },
      },
    },
  });

  // Check if there are more results
  const hasNextPage = conversations.length > limit;
  const edges = hasNextPage ? conversations.slice(0, limit) : conversations;

  // Fetch metadata for each conversation (unread count, last message)
  const conversationsWithMetadata = await Promise.all(
    edges.map(async (conv): Promise<ConversationEdge> => {
      // Get user's membership for unread count
      const member = await ctx.db.chatMember.findUnique({
        where: {
          conversationId_userId: {
            conversationId: conv.id,
            userId,
          },
        },
      });

      // Calculate unread count
      const unreadCount = await ctx.db.chatMessage.count({
        where: {
          conversationId: conv.id,
          sequence: { gt: member?.lastReadSeq || 0 },
          deletedAt: null,
        },
      });

      // Fetch last message
      const lastMessage = await ctx.db.chatMessage.findFirst({
        where: {
          conversationId: conv.id,
          deletedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          content: true,
          authorUserId: true,
          createdAt: true,
        },
      });

      return {
        id: conv.id,
        type: conv.type as ConversationType,
        name: conv.name,
        description: conv.topic, // Prisma schema uses 'topic' field
        isPublic:
          conv.type === "CHANNEL" && !conv.name?.startsWith("#private-"), // Inferred from type
        workspaceId: conv.workspaceId,
        projectId: conv.projectId,
        memberCount: conv.members.length,
        unreadCount,
        lastMessage,
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
        ? edges[edges.length - 1].updatedAt.toISOString()
        : null,
    },
  };
};
