export const deleteWorkspaceTypeDefs = `
  extend type Mutation {
    deleteWorkspace(workspaceId: ID!): Boolean!
  }
`;
