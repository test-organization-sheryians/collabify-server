export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    deleteGroup(workspaceId: ID!, groupId: ID!): DeleteGroupResult!
  }

  type DeleteGroupResult {
    success: Boolean!
    groupId: ID!
  }
`;
