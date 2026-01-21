import { typeDefs as createChannelTypeDefs } from "../services/create-channel";
import { typeDefs as archiveChannelTypeDefs } from "../services/archive-channel";
import { typeDefs as renameChannelTypeDefs } from "../services/rename-channel";
import { typeDefs as createThreadTypeDefs } from "../services/create-thread";

import { typeDefs as getChannelMessagesTypeDefs } from "../queries/get-channel-messages";
import { typeDefs as getThreadMessagesTypeDefs } from "../queries/get-thread-messages";
import { typeDefs as getMessageByIdTypeDefs } from "../queries/get-message-by-id";
import { typeDefs as getMessagesAfterCursorTypeDefs } from "../queries/get-messages-after-cursor";
import { typeDefs as getMissingMessagesTypeDefs } from "../queries/get-missing-messages";
import { typeDefs as getUserChannelsTypeDefs } from "../queries/get-user-channels";
import { typeDefs as getChannelMembersTypeDefs } from "../queries/get-channel-members";
import { typeDefs as getChannelUnreadCountTypeDefs } from "../queries/get-channel-unread-count";
import { typeDefs as getSubscribedChannelsTypeDefs } from "../queries/get-subscribed-channels";
import { typeDefs as getLastReadMessageTypeDefs } from "../queries/get-last-read-message";
import { typeDefs as getPresenceMapTypeDefs } from "../queries/get-presence-map";

const sharedTypeDefs = /* GraphQL */ `
  type ChatChannel {
    id: ID!
    workspaceId: ID!
    projectId: ID
    type: ChannelType!
    name: String
    topic: String
    isArchived: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
    deletedAt: DateTime
    # Computed/Loaded fields
    members: [ChatMember!]
    lastMessage: ChatMessage
    memberCount: Int!
  }

  enum ChannelType {
    PUBLIC
    PRIVATE
    DM
  }

  type ChatMember {
    id: ID!
    channelId: ID!
    userId: ID!
    lastReadMsgId: ID
    lastDeliveredMsgId: ID
    role: String!
    isMuted: Boolean!
    joinedAt: DateTime!
  }

  type ChatMessage {
    id: ID!
    channelId: ID!
    authorUserId: ID!
    content: JSON!
    type: String!
    createdAt: DateTime!
    # Add other fields as needed
  }

  type UserPresence {
    userId: ID!
    status: PresenceStatus!
    lastActiveAt: DateTime
  }

  enum PresenceStatus {
    ONLINE
    AWAY
    OFFLINE
  }
`;

export const typeDefs = [
  sharedTypeDefs,
  // Services (Mutations)
  createChannelTypeDefs,
  archiveChannelTypeDefs,
  renameChannelTypeDefs,
  createThreadTypeDefs,

  // Queries (Reads)
  getChannelMessagesTypeDefs,
  getThreadMessagesTypeDefs,
  getMessageByIdTypeDefs,
  getMessagesAfterCursorTypeDefs,
  getMissingMessagesTypeDefs,
  getUserChannelsTypeDefs,
  getChannelMembersTypeDefs,
  getChannelUnreadCountTypeDefs,
  getSubscribedChannelsTypeDefs,
  getLastReadMessageTypeDefs,
  getPresenceMapTypeDefs,
];
