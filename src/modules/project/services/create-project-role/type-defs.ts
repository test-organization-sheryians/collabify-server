export const createProjectRoleTypeDefs = /* GraphQL */ `
  input CreateProjectRoleInput {
    name: String!
    description: String
    rank: Int!
  }

  extend type Mutation {
    createProjectRole(projectId: ID!, workspaceId: ID!, input: CreateProjectRoleInput!): ProjectRole!
  }
`;
