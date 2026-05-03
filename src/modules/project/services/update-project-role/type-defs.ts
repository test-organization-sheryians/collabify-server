export const updateProjectRoleTypeDefs = /* GraphQL */ `
  input UpdateProjectRoleInput {
    name: String
    description: String
    rank: Int
  }

  extend type Mutation {
    updateProjectRole(roleId: ID!, projectId: ID!, workspaceId: ID!, input: UpdateProjectRoleInput!): ProjectRole!
  }
`;
