export const getProjectPermissionsTypeDefs = /* GraphQL */ `
  extend type Query {
    projectPermissions(workspaceId: ID!, projectId: ID!): [Permission!]!
  }
`;
