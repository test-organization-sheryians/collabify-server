export const typeDefs = /* GraphQL */ `
  extend type Query {
    getMissingMessages(
      channelId: ID!
      rangeStart: ID!
      rangeEnd: ID!
    ): [ChatMessage!]!
  }
`;
