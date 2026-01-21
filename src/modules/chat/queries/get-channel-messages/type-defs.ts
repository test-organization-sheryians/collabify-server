export const typeDefs = /* GraphQL */ `
  extend type Query {
    getChannelMessages(
      channelId: ID!
      limit: Int
      beforeCursor: ID
    ): [ChatMessage!]!
  }
`;
