export const getWorkspaceRolesTypeDefs = /* GraphQL */ `
  extend type Query {
    workspaceRoles(workspaceId: ID!): [WorkspaceRole!]!
  }
`;
