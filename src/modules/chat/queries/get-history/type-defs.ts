
export const typeDefs = /* GraphQL */ `
  type HistoryPayload {
    messages: [ChatMessage!]!
    hasMore: Boolean!
    minSequence: Int
  }

  extend type Query {
    history(
      conversationId: ID!
      beforeSequence: Int!
      limit: Int
    ): HistoryPayload!
  }
`;
