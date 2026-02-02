export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    addChannelMembers(
      workspaceId: ID!
      channelId: ID!
      userIds: [ID!]!
    ): AddChannelMembersResult!
  }

  type AddChannelMembersResult {
    success: Boolean!
    addedCount: Int!
    skippedCount: Int!
    members: [ChannelMemberInfo!]!
  }

  type ChannelMemberInfo {
    userId: ID!
    user: UserBasic!
  }
`;
