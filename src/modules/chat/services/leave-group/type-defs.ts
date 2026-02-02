export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    leaveGroup(workspaceId: ID!, groupId: ID!): LeaveGroupResult!
  }

  type LeaveGroupResult {
    success: Boolean!
    groupId: ID!
  }
`;
