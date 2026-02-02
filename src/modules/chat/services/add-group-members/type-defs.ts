export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    addGroupMembers(
      workspaceId: ID!
      groupId: ID!
      userIds: [ID!]!
    ): AddGroupMembersResult!
  }

  type AddGroupMembersResult {
    success: Boolean!
    addedCount: Int!
    skippedCount: Int!
    members: [GroupMemberInfo!]!
  }

  type GroupMemberInfo {
    userId: ID!
    user: UserBasic!
  }
`;
