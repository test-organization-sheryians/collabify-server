export const createWorkspaceRoleTypeDefs = /* GraphQL */ `
  input CreateWorkspaceRoleInput {
    name: String!
    description: String
    rank: Int!
  }

  extend type Mutation {
    createWorkspaceRole(workspaceId: ID!, input: CreateWorkspaceRoleInput!): WorkspaceRole!
  }
`;
