export const typeDefs = /* GraphQL */ `
  extend type Query {
    getMessagesAfterCursor(
      channelId: ID!
      afterCursor: ID!
      limit: Int
    ): [ChatMessage!]!
  }
`;
