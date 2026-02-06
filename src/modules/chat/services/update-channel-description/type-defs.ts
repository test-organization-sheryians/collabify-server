export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    updateChannelDescription(
      workspaceId: ID!
      channelId: ID!
      description: String
    ): UpdateChannelDescriptionResult!
  }

  type UpdateChannelDescriptionResult {
    success: Boolean!
    channelId: ID!
    description: String
  }
`;
