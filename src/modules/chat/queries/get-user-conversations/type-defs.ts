export const typeDefs = /* GraphQL */ `
  extend type Query {
    getUserConversations(
      workspaceId: ID!
      projectId: ID!
      type: ConversationType
      includeArchived: Boolean
      limit: Int
      cursor: String
    ): ConversationConnection!
  }

  type ConversationConnection {
    edges: [ConversationEdge!]!
    pageInfo: PageInfo!
  }

  type ConversationEdge {
    id: ID!
    type: ConversationType!
    name: String
    description: String
    isPublic: Boolean!
    workspaceId: ID!
    projectId: ID
    memberCount: Int!
    unreadCount: Int!
    lastMessage: LastMessagePreview
    createdAt: DateTime!
    updatedAt: DateTime!
    deletedAt: DateTime
  }

  type LastMessagePreview {
    id: ID!
    content: JSON!
    authorUserId: ID!
    createdAt: DateTime!
  }

  type PageInfo {
    hasNextPage: Boolean!
    endCursor: String
  }
`;
