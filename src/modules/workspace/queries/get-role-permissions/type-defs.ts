export const getRolePermissionsTypeDefs = /* GraphQL */ `
  extend type Query {
    rolePermissions(roleId: ID!, workspaceId: ID!): [RolePermission!]!
  }
`;
