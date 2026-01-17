export const getWorkspaceBySlugTypeDefs = `
  extend type Query {
    workspaceBySlug(slug: String!): Workspace!
  }
`;
