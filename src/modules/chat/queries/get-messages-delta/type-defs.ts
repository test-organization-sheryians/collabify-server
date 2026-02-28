export const typeDefs = /* GraphQL */ `
  type MessagesDelta {
    messages: [ChatMessage!]!
    hasMore: Boolean! # For client to know if it should keep fetching
    lastSequence: Int! # Validated Top Sequence
  }

  extend type Query {
    messagesDelta(
      conversationId: ID!
      afterSequence: Int
      afterStreamId: String
      limit: Int
    ): MessagesDelta!
  }
`;
