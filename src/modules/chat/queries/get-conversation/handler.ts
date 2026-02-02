import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { GetConversationInput, GetConversationOutput } from "./types";
import { ConversationType } from "@/graphql/generated";

/**
 * Get Conversation Handler
 *
 * Fetches a single conversation with full membership details and metadata.
 */
export const handler = async (
  input: GetConversationInput,
  ctx: ServiceContext
): Promise<GetConversationOutput> => {
  const { userId } = ctx.auth;
  if (!userId) {
    throw AppError.unauthorized("User not authenticated");
  }

  const { conversationId } = input;

  // Fetch conversation with membership check
  const conversation = await ctx.db.chatConversation.findFirst({
    where: {
      id: conversationId,
      members: {
        some: { userId },
      },
      deletedAt: null,
    },
    include: {
      members: {
        include: {
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
    },
  });

  if (!conversation) {
    throw AppError.notFound("Conversation not found or access denied");
  }

  // Get user's member record for unread count
  const userMember = conversation.members.find((m) => m.userId === userId);

  // Calculate unread count
  const unreadCount = await ctx.db.chatMessage.count({
    where: {
      conversationId,
      sequence: { gt: userMember?.lastReadSeq || 0 },
      deletedAt: null,
    },
  });

  // Fetch last message
  const lastMessage = await ctx.db.chatMessage.findFirst({
    where: {
      conversationId,
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
    id: conversation.id,
    type: conversation.type as unknown as ConversationType,
    name: conversation.name,
    description: conversation.topic, // Prisma uses 'topic' field
    isPublic: conversation.type === "CHANNEL", // Inferred from type
    workspaceId: conversation.workspaceId,
    projectId: conversation.projectId,
    parentMessageId: conversation.parentMessageId,
    createdBy: null, // Field doesn't exist in schema
    memberCount: conversation.members.length,
    unreadCount,
    members: conversation.members.map((m) => ({
      userId: m.userId,
      role: m.role,
      isMuted: m.isMuted,
      joinedAt: m.joinedAt,
      user: {
        ...m.user,
        fullName: m.user.fullName || "Unknown",
      },
    })),
    lastMessage,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    deletedAt: conversation.deletedAt,
  };
};
