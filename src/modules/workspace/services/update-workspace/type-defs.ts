export const updateWorkspaceTypeDefs = `
  input UpdateWorkspaceInput {
    name: String
    logoUrl: String
    domainWhitelist: String
  }

  extend type Mutation {
    updateWorkspace(workspaceId: ID!, input: UpdateWorkspaceInput!): Workspace!
  }
`;
