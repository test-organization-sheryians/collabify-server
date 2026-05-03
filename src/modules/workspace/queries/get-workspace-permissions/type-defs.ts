export const getWorkspacePermissionsTypeDefs = /* GraphQL */ `
  extend type Query {
    workspacePermissions(workspaceId: ID!): [Permission!]!
  }
`;
