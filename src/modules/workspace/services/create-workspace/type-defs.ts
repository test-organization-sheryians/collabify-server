export const createWorkspaceTypeDefs = `
  extend type Mutation {
    createWorkspace(slug: String!, name: String!): Workspace!
  }
`;
