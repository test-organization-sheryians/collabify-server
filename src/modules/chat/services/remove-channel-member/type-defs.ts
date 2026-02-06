export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    removeChannelMember(
      workspaceId: ID!
      channelId: ID!
      userId: ID!
    ): RemoveChannelMemberResult!
  }

  type RemoveChannelMemberResult {
    success: Boolean!
    channelId: ID!
    userId: ID!
  }
`;
