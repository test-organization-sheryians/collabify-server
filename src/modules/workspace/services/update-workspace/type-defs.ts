export const updateWorkspaceTypeDefs = `
  input UpdateWorkspaceInput {
    name: String
    logoS3Key: String
    domainWhitelist: String
  }

  extend type Mutation {
    updateWorkspace(workspaceId: ID!, input: UpdateWorkspaceInput!): Workspace!
  }
`;
