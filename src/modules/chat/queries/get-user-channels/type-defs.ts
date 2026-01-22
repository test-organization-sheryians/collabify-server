export const typeDefs = /* GraphQL */ `
  extend type Query {
    getUserChannels(workspaceId: ID!, limit: Int, offset: Int): [ChatChannel!]!
  }
`;
