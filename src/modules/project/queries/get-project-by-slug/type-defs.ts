export const typeDefs = `
  extend type Query {
    projectBySlug(workspaceId: ID!, slug: String!): Project
  }
`;
