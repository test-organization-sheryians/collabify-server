export const getProjectRolesTypeDefs = /* GraphQL */ `
  extend type Query {
    projectRoles(projectId: ID!, workspaceId: ID!): [ProjectRole!]!
  }
`;
