export const assignRolePermissionTypeDefs = /* GraphQL */ `
  extend type Mutation {
    assignRolePermission(
      roleId: ID!
      workspaceId: ID!
      permissionId: ID!
      effect: String
      conditions: String
    ): RolePermission!
  }
`;
