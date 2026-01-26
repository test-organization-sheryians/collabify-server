export const typeDefs = /* GraphQL */ `
  extend type Query {
    getUserChannels(
      workspaceId: ID!
      projectId: ID!
      limit: Int
      offset: Int
    ): [Conversation!]!
  }
`;
