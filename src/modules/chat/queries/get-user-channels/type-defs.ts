export const typeDefs = /* GraphQL */ `
  extend type Query {
    getUserChannels(userId: ID!): [ChatChannel!]!
  }
`;
