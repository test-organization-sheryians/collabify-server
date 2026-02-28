export const typeDefs = /* GraphQL */ `
  extend type Query {
    getChannelMembers(
      channelId: ID!
      limit: Int
      offset: Int
    ): [ChatMemberRecord!]!
  }
`;
