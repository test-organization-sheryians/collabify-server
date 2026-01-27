export const typeDefs = /* GraphQL */ `
  extend type Query {
    messagesDelta(
      conversationId: ID!
      afterStreamId: String!
      limit: Int
    ): [ChatMessage!]!
  }
`;
