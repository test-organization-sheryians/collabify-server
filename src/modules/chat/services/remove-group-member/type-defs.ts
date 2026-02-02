export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    removeGroupMember(
      workspaceId: ID!
      groupId: ID!
      userId: ID!
    ): RemoveGroupMemberResult!
  }

  type RemoveGroupMemberResult {
    success: Boolean!
    groupId: ID!
    userId: ID!
  }
`;
