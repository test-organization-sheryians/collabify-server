export const typeDefs = /* GraphQL */ `
  extend type Query {
    getChannelUnreadCount(channelId: ID!): Int!
  }
`;
