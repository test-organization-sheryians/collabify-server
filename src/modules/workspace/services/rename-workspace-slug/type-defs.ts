export const renameWorkspaceSlugTypeDefs = `
  extend type Mutation {
    renameWorkspaceSlug(workspaceId: ID!, slug: String!): Workspace!
  }
`;
