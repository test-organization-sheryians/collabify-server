export const typeDefs = /* GraphQL */ `
  extend type Query {
    getChannelById(channelId: ID!): Conversation
  }
`;
