import { Resolvers } from "@/graphql/generated";

import { requireUser } from "@/shared/utils/graphql-helpers";
import * as queries from "../queries";
import * as services from "../services";

export const resolvers: Resolvers = {
  Query: {
    getThreadMessages: async (_, args, ctx) => {
      await requireUser(ctx);
      const input =
        queries.getThreadMessages.getThreadMessagesSchema.parse(args);
      return queries.getThreadMessages.handler(input, ctx);
    },
    getMessageById: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = queries.getMessageById.getMessageByIdSchema.parse(args);
      return queries.getMessageById.handler(input, ctx);
    },
    // @ts-expect-error - Field resolvers (ChatMessage.replyCount, isEdited, editedAt) compute missing fields
    getMessagesAfterCursor: async (_, args, ctx) => {
      await requireUser(ctx);
      const input =
        queries.getMessagesAfterCursor.getMessagesAfterCursorSchema.parse(args);
      return queries.getMessagesAfterCursor.handler(input, ctx);
    },
    getMissingMessages: async (_, args, ctx) => {
      await requireUser(ctx);
      const input =
        queries.getMissingMessages.getMissingMessagesSchema.parse(args);
      return queries.getMissingMessages.handler(input, ctx);
    },
    getChannelMembers: async (_, args, ctx) => {
      await requireUser(ctx);
      const input =
        queries.getChannelMembers.getChannelMembersSchema.parse(args);
      return queries.getChannelMembers.handler(input, ctx);
    },
    getLastReadMessage: async (_, args, ctx) => {
      await requireUser(ctx);
      const input =
        queries.getLastReadMessage.getLastReadMessageSchema.parse(args);
      return queries.getLastReadMessage.handler(input, ctx);
    },
    // @ts-expect-error - Field resolvers (ChatMessage.replyCount, isEdited, editedAt) compute missing fields
    messagesDelta: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = queries.getMessagesDelta.getMessagesDeltaSchema.parse(args);
      return queries.getMessagesDelta.handler(input, ctx);
    },
    history: async (_, args, ctx) => {
      await requireUser(ctx); // Ensure Auth
      const input = queries.getHistory.GetHistoryInputSchema.parse(args);
      return queries.getHistory.handler(input, ctx);
    },
    messageReactions: async (_, args, ctx) => {
      await requireUser(ctx);
      const input =
        queries.getMessageReactions.getMessageReactionsSchema.parse(args);
      return queries.getMessageReactions.handler(input, ctx);
    },
    getUnreadCounts: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = queries.getUnreadCounts.getUnreadCountsSchema.parse(args);
      return queries.getUnreadCounts.handler(input, ctx);
    },
    getReadReceipts: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = queries.getReadReceipts.getReadReceiptsSchema.parse(args);
      return queries.getReadReceipts.handler(input, ctx);
    },
    // Phase 1 queries
    /**
     * @deprecated
     * @param _ check is this compure missing fields problem
     * @param args
     * @param ctx
     * @returns
     */
    getUserConversations: async (_, args, ctx) => {
      await requireUser(ctx);
      const input =
        queries.getUserConversations.getUserConversationsSchema.parse(args);
      return queries.getUserConversations.handler(input, ctx);
    },
    getConversation: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = queries.getConversation.getConversationSchema.parse(args);
      return queries.getConversation.handler(input, ctx);
    },
    getDmByUsers: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = queries.getDmByUsers.getDmByUsersSchema.parse(args);
      return queries.getDmByUsers.handler(input, ctx);
    },
    reactionUsers: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = queries.getReactionUsers.getReactionUsersSchema.parse(args);
      return queries.getReactionUsers.handler(input, ctx);
    },
  },
  Mutation: {
    createChannel: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.createChannel.createChannelSchema.parse(
        args.input
      );
      return services.createChannel.handler(input, ctx);
    },
    archiveChannel: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.archiveChannel.archiveChannelSchema.parse(
        args.input
      );
      return services.archiveChannel.handler(input, ctx);
    },
    renameChannel: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.renameChannel.renameChannelSchema.parse(
        args.input
      );
      return services.renameChannel.handler(input, ctx);
    },
    createThread: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.createThread.createThreadInputSchema.parse(
        args.input
      );
      return services.createThread.handler(input, ctx);
    },
    checkChannelAvailability: async (_, args, ctx) => {
      await requireUser(ctx);
      const input =
        services.checkChannelAvailability.CheckChannelAvailabilitySchema.parse(
          args.input
        );
      return services.checkChannelAvailability.handler(input, ctx);
    },
    createDm: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.createDm.createDmInputSchema.parse(args.input);
      return services.createDm.handler(input, ctx);
    },
    createGroup: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.createGroup.createGroupInputSchema.parse(
        args.input
      );
      return services.createGroup.handler(input, ctx);
    },
    // Phase 2 services
    deleteChannel: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.deleteChannel.deleteChannelSchema.parse(args);
      return services.deleteChannel.handler(input, ctx);
    },
    unarchiveChannel: async (_, args, ctx) => {
      await requireUser(ctx);
      const input =
        services.unarchiveChannel.unarchiveChannelSchema.parse(args);
      return services.unarchiveChannel.handler(input, ctx);
    },
    updateChannelDescription: async (_, args, ctx) => {
      await requireUser(ctx);
      const input =
        services.updateChannelDescription.updateChannelDescriptionSchema.parse(
          args
        );
      return services.updateChannelDescription.handler(input, ctx);
    },
    updateChannelVisibility: async (_, args, ctx) => {
      await requireUser(ctx);
      const input =
        services.updateChannelVisibility.updateChannelVisibilitySchema.parse(
          args
        );
      return services.updateChannelVisibility.handler(input, ctx);
    },
    addChannelMembers: async (_, args, ctx) => {
      await requireUser(ctx);
      const input =
        services.addChannelMembers.addChannelMembersSchema.parse(args);
      return services.addChannelMembers.handler(input, ctx);
    },
    removeChannelMember: async (_, args, ctx) => {
      await requireUser(ctx);
      const input =
        services.removeChannelMember.removeChannelMemberSchema.parse(args);
      return services.removeChannelMember.handler(input, ctx);
    },
    // Phase 3 services
    deleteDm: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.deleteDm.deleteDmSchema.parse(args);
      return services.deleteDm.handler(input, ctx);
    },
    muteConversation: async (_, args, ctx) => {
      await requireUser(ctx);
      const input =
        services.muteConversation.muteConversationSchema.parse(args);
      return services.muteConversation.handler(input, ctx);
    },
    renameGroup: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.renameGroup.renameGroupSchema.parse(args);
      return services.renameGroup.handler(input, ctx);
    },
    deleteGroup: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.deleteGroup.deleteGroupSchema.parse(args);
      return services.deleteGroup.handler(input, ctx);
    },
    addGroupMembers: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.addGroupMembers.addGroupMembersSchema.parse(args);
      return services.addGroupMembers.handler(input, ctx);
    },
    removeGroupMember: async (_, args, ctx) => {
      await requireUser(ctx);
      const input =
        services.removeGroupMember.removeGroupMemberSchema.parse(args);
      return services.removeGroupMember.handler(input, ctx);
    },
    leaveGroup: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.leaveGroup.leaveGroupSchema.parse(args);
      return services.leaveGroup.handler(input, ctx);
    },
    // Phase 4 services
    closeThread: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.closeThread.closeThreadSchema.parse(args);
      return services.closeThread.handler(input, ctx);
    },
    reopenThread: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.reopenThread.reopenThreadSchema.parse(args);
      return services.reopenThread.handler(input, ctx);
    },
    deleteThread: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.deleteThread.deleteThreadSchema.parse(args);
      return services.deleteThread.handler(input, ctx);
    },
    subscribeThread: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.subscribeThread.subscribeThreadSchema.parse(args);
      return services.subscribeThread.handler(input, ctx);
    },
    unsubscribeThread: async (_, args, ctx) => {
      await requireUser(ctx);
      const input =
        services.unsubscribeThread.unsubscribeThreadSchema.parse(args);
      return services.unsubscribeThread.handler(input, ctx);
    },
  },
  Conversation: {
    members: (parent, _args, ctx) => {
      if (!ctx.dataloaders.chat)
        throw new Error("Chat dataloaders not initialized");
      return ctx.dataloaders.chat.membersByChannelId.load(parent.id);
    },
    lastMessage: (parent, _args, ctx) => {
      if (!ctx.dataloaders.chat)
        throw new Error("Chat dataloaders not initialized");
      return ctx.dataloaders.chat.lastMessageByChannelId.load(parent.id);
    },
    memberCount: (parent, _args, ctx) => {
      if (!ctx.dataloaders.chat)
        throw new Error("Chat dataloaders not initialized");
      return ctx.dataloaders.chat.memberCountByChannelId.load(parent.id);
    },
  },
  ChatMessage: {
    // Passthrough fields from Prisma (mapper tells TS these come from ChatMessage model)
    id: (parent) => parent.id,
    conversationId: (parent) => parent.conversationId,
    authorUserId: (parent) => parent.authorUserId,
    content: (parent) => parent.content,
    type: (parent) => parent.type,
    streamId: (parent) => parent.streamId,
    sequence: (parent) => parent.sequence,
    createdAt: (parent) => parent.createdAt,
    parentMessageId: (parent) => parent.parentMessageId,
    metadata: (parent) => parent.metadata,
    deletedAt: (parent) => parent.deletedAt,

    // Computed fields (field resolvers add these)
    replyCount: async (parent, _args, ctx) => {
      if (!ctx.dataloaders.chat) {
        throw new Error("Chat dataloaders not initialized");
      }
      return ctx.dataloaders.chat.replyCountByMessageId.load(parent.id);
    },

    isEdited: (parent) => {
      const metadata = parent.metadata as Record<string, unknown> | null;
      return metadata?.editedAt !== null && metadata?.editedAt !== undefined;
    },

    editedAt: (parent) => {
      const metadata = parent.metadata as Record<string, unknown> | null;
      return (metadata?.editedAt as Date | null) || null;
    },
  },
};
