export const deleteProjectRoleTypeDefs = /* GraphQL */ `
  extend type Mutation {
    deleteProjectRole(roleId: ID!, projectId: ID!, workspaceId: ID!): Boolean!
  }
`;
