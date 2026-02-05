import { typeDefs as createChannelTypeDefs } from "../services/create-channel";
import { typeDefs as archiveChannelTypeDefs } from "../services/archive-channel";
import { typeDefs as renameChannelTypeDefs } from "../services/rename-channel";
import { typeDefs as createThreadTypeDefs } from "../services/create-thread";
import { typeDefs as checkChannelAvailabilityTypeDefs } from "../services/check-channel-availability";
import { typeDefs as createDmTypeDefs } from "../services/create-dm";
import { typeDefs as createGroupTypeDefs } from "../services/create-group";
// Phase 2 service imports
import { typeDefs as deleteChannelTypeDefs } from "../services/delete-channel";
import { typeDefs as unarchiveChannelTypeDefs } from "../services/unarchive-channel";
import { typeDefs as updateChannelDescriptionTypeDefs } from "../services/update-channel-description";
import { typeDefs as updateChannelVisibilityTypeDefs } from "../services/update-channel-visibility";
import { typeDefs as addChannelMembersTypeDefs } from "../services/add-channel-members";
import { typeDefs as removeChannelMemberTypeDefs } from "../services/remove-channel-member";
// Phase 3 service imports
import { typeDefs as deleteDmTypeDefs } from "../services/delete-dm";
import { typeDefs as muteConversationTypeDefs } from "../services/mute-conversation";
import { typeDefs as renameGroupTypeDefs } from "../services/rename-group";
import { typeDefs as deleteGroupTypeDefs } from "../services/delete-group";
import { typeDefs as addGroupMembersTypeDefs } from "../services/add-group-members";
import { typeDefs as removeGroupMemberTypeDefs } from "../services/remove-group-member";
import { typeDefs as leaveGroupTypeDefs } from "../services/leave-group";
// Phase 4 service imports
import { typeDefs as closeThreadTypeDefs } from "../services/close-thread";
import { typeDefs as reopenThreadTypeDefs } from "../services/reopen-thread";
import { typeDefs as deleteThreadTypeDefs } from "../services/delete-thread";
import { typeDefs as subscribeThreadTypeDefs } from "../services/subscribe-thread";
import { typeDefs as unsubscribeThreadTypeDefs } from "../services/unsubscribe-thread";

import { typeDefs as getThreadMessagesTypeDefs } from "../queries/get-thread-messages";
import { typeDefs as getMessageByIdTypeDefs } from "../queries/get-message-by-id";
import { typeDefs as getMessagesAfterCursorTypeDefs } from "../queries/get-messages-after-cursor";
import { typeDefs as getMissingMessagesTypeDefs } from "../queries/get-missing-messages";
import { typeDefs as getChannelMembersTypeDefs } from "../queries/get-channel-members";
import { typeDefs as getLastReadMessageTypeDefs } from "../queries/get-last-read-message";
import { typeDefs as getMessagesDeltaTypeDefs } from "../queries/get-messages-delta";
import { typeDefs as getHistoryTypeDefs } from "../queries/get-history";
import { typeDefs as getMessageReactionsTypeDefs } from "../queries/get-message-reactions";
import { typeDefs as getReactionUsersTypeDefs } from "../queries/get-reaction-users";
import { typeDefs as getUnreadCountsTypeDefs } from "../queries/get-unread-counts";
import { typeDefs as getReadReceiptsTypeDefs } from "../queries/get-read-receipts";
// Phase 1 queries
import { typeDefs as getUserConversationsTypeDefs } from "../queries/get-user-conversations";
import { typeDefs as getConversationTypeDefs } from "../queries/get-conversation";
import { typeDefs as getDmByUsersTypeDefs } from "../queries/get-dm-by-users";
import { typeDefs as getUsersByIdsTypeDefs } from "../queries/get-users-by-ids";

const sharedTypeDefs = /* GraphQL */ `
  type Conversation {
    id: ID!
    workspaceId: ID!
    projectId: ID
    type: ConversationType!
    name: String
    topic: String
    isPublic: Boolean!
    parentMessageId: ID
    createdBy: ID
    isArchived: Boolean!
    unreadCount: Int!
    memberCount: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
    deletedAt: DateTime
    # Computed/Loaded fields
    members: [ConversationMember!]
    lastMessage: LastMessagePreview
  }

  enum ConversationType {
    CHANNEL
    DM
    GROUP_DM
    THREAD
  }

  type ConversationMember {
    userId: ID!
    role: String!
    isMuted: Boolean!
    joinedAt: DateTime!
    user: UserBasic!
  }

  type UserBasic {
    id: ID!
    fullName: String!
    email: String!
    avatarUrl: String
  }

  type LastMessagePreview {
    id: ID!
    content: JSON!
    authorUserId: ID!
    createdAt: DateTime!
  }

  type ChatMemberRecord {
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
    parentMessageId: ID # For inline replies (message-reference)
    # Computed fields (resolved via field resolvers)
    replyCount: Int!
    isEdited: Boolean!
    editedAt: DateTime

    # Optional metadata (for debugging/admin)
    metadata: JSON
    deletedAt: DateTime
  }

  type MessageReaction {
    emoji: String!
    count: Int!
    hasReacted: Boolean!
    recentUsers: [User!]!
  }

  type ReactionUsersConnection {
    users: [User!]!
    nextCursor: Int
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
  createDmTypeDefs,
  createGroupTypeDefs,
  // Phase 2 services
  deleteChannelTypeDefs,
  unarchiveChannelTypeDefs,
  updateChannelDescriptionTypeDefs,
  updateChannelVisibilityTypeDefs,
  addChannelMembersTypeDefs,
  removeChannelMemberTypeDefs,
  // Phase 3 services
  deleteDmTypeDefs,
  muteConversationTypeDefs,
  renameGroupTypeDefs,
  deleteGroupTypeDefs,
  addGroupMembersTypeDefs,
  removeGroupMemberTypeDefs,
  leaveGroupTypeDefs,
  // Phase 4 services
  closeThreadTypeDefs,
  reopenThreadTypeDefs,
  deleteThreadTypeDefs,
  subscribeThreadTypeDefs,
  unsubscribeThreadTypeDefs,

  // Queries (Reads)
  getThreadMessagesTypeDefs,
  getMessageByIdTypeDefs,
  getMessagesAfterCursorTypeDefs,
  getMissingMessagesTypeDefs,
  getChannelMembersTypeDefs,
  getLastReadMessageTypeDefs,
  getMessagesDeltaTypeDefs,
  getHistoryTypeDefs,
  getMessageReactionsTypeDefs,
  getReactionUsersTypeDefs,
  getUnreadCountsTypeDefs,
  getReadReceiptsTypeDefs,
  // Phase 1 queries
  getUserConversationsTypeDefs,
  getConversationTypeDefs,
  getDmByUsersTypeDefs,
  getUsersByIdsTypeDefs,
];
