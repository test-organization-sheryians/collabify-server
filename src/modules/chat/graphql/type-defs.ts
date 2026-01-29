import { typeDefs as createChannelTypeDefs } from "../services/create-channel";
import { typeDefs as archiveChannelTypeDefs } from "../services/archive-channel";
import { typeDefs as renameChannelTypeDefs } from "../services/rename-channel";
import { typeDefs as createThreadTypeDefs } from "../services/create-thread";
import { typeDefs as checkChannelAvailabilityTypeDefs } from "../services/check-channel-availability";

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
import { typeDefs as getMessagesDeltaTypeDefs } from "../queries/get-messages-delta";
import { typeDefs as getHistoryTypeDefs } from "../queries/get-history";

const sharedTypeDefs = /* GraphQL */ `
  type Conversation {
    id: ID!
    workspaceId: ID!
    projectId: ID
    type: ConversationType!
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

  enum ConversationType {
    CHANNEL
    DM
    GROUP_DM
  }

  type ChatMember {
    id: ID!
    conversationId: ID!
    userId: ID!
    lastReadMsgId: ID
    lastDeliveredMsgId: ID
    role: String!
    isMuted: Boolean!
    joinedAt: DateTime!
  }

  type ChatMessage {
    id: ID!
    conversationId: ID!
    authorUserId: ID!
    content: JSON!
    type: String!
    streamId: String!
    sequence: Int!
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
  checkChannelAvailabilityTypeDefs,

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
  getMessagesDeltaTypeDefs,
  getHistoryTypeDefs,
];
