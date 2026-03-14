export const removeRolePermissionTypeDefs = /* GraphQL */ `
  extend type Mutation {
    removeRolePermission(roleId: ID!, workspaceId: ID!, permissionId: ID!): Boolean!
  }
`;
