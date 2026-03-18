export const getWorkspaceByIdTypeDefs = `
  extend type Query {
    workspaceById(workspaceId: ID!): Workspace
  }
`;
