export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    unarchiveChannel(workspaceId: ID!, channelId: ID!): UnarchiveChannelResult!
  }

  type UnarchiveChannelResult {
    success: Boolean!
    channelId: ID!
    name: String!
  }
`;
