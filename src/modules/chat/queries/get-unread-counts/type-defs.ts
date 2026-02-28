export const typeDefs = /* GraphQL */ `
  extend type Query {
    getUnreadCounts(workspaceId: ID!, projectId: ID!): UnreadCountsResponse!
  }

  type UnreadCountsResponse {
    conversations: [ConversationUnreadCount!]!
  }

  type ConversationUnreadCount {
    conversationId: ID!
    unreadCount: Int!
    lastUnreadMessageId: ID
  }
`;
