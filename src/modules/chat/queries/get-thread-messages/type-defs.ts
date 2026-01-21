export const typeDefs = /* GraphQL */ `
  extend type Query {
    getThreadMessages(
      parentMessageId: ID!
      limit: Int
      beforeCursor: ID
    ): [ChatMessage!]!
  }
`;
