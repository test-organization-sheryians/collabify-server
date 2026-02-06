export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    deleteChannel(workspaceId: ID!, channelId: ID!): DeleteChannelResult!
  }

  type DeleteChannelResult {
    success: Boolean!
    channelId: ID!
  }
`;
