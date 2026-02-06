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
    edges: [Conversation!]!
    pageInfo: PageInfo!
  }

  type PageInfo {
    hasNextPage: Boolean!
    endCursor: String
  }
`;
