import { Resolvers } from "@/graphql/generated";

import { requireUser } from "@/shared/utils/graphql-helpers";
import * as queries from "../queries";
import * as services from "../services";

export const resolvers: Resolvers = {
  Query: {
    getChannelMessages: async (_, args, ctx) => {
      await requireUser(ctx);
      const input =
        queries.getChannelMessages.getChannelMessagesSchema.parse(args);
      return queries.getChannelMessages.handler(input, ctx);
    },
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
    getUserChannels: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = queries.getUserChannels.getUserChannelsSchema.parse(args);
      return queries.getUserChannels.handler(input, ctx);
    },
    getChannelMembers: async (_, args, ctx) => {
      await requireUser(ctx);
      const input =
        queries.getChannelMembers.getChannelMembersSchema.parse(args);
      return queries.getChannelMembers.handler(input, ctx);
    },
    getChannelUnreadCount: async (_, args, ctx) => {
      await requireUser(ctx);
      const input =
        queries.getChannelUnreadCount.getChannelUnreadCountSchema.parse(args);
      return queries.getChannelUnreadCount.handler(input, ctx);
    },
    getSubscribedChannels: async (_, _args, ctx) => {
      await requireUser(ctx);
      // No schema parsing needed for pure getter, or could parse empty object if strict
      return queries.getSubscribedChannels.handler({}, ctx);
    },
    getLastReadMessage: async (_, args, ctx) => {
      await requireUser(ctx);
      const input =
        queries.getLastReadMessage.getLastReadMessageSchema.parse(args);
      return queries.getLastReadMessage.handler(input, ctx);
    },
    getPresenceMap: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = queries.getPresenceMap.getPresenceMapSchema.parse(args);
      return queries.getPresenceMap.handler(input, ctx);
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
      const input = services.createThread.createThreadSchema.parse(args.input);
      return services.createThread.handler(input, ctx);
    },
  },
  ChatChannel: {
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
};
