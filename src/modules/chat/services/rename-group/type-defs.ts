export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    renameGroup(
      workspaceId: ID!
      groupId: ID!
      name: String!
    ): RenameGroupResult!
  }

  type RenameGroupResult {
    success: Boolean!
    groupId: ID!
    name: String!
  }
`;
