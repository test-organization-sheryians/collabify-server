export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    updateChannelVisibility(
      workspaceId: ID!
      channelId: ID!
      isPublic: Boolean!
    ): UpdateChannelVisibilityResult!
  }

  type UpdateChannelVisibilityResult {
    success: Boolean!
    channelId: ID!
    isPublic: Boolean!
  }
`;
