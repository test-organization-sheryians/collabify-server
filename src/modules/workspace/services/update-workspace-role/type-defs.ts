export const updateWorkspaceRoleTypeDefs = /* GraphQL */ `
  input UpdateWorkspaceRoleInput {
    name: String
    description: String
    rank: Int
  }

  extend type Mutation {
    updateWorkspaceRole(roleId: ID!, workspaceId: ID!, input: UpdateWorkspaceRoleInput!): WorkspaceRole!
  }
`;
