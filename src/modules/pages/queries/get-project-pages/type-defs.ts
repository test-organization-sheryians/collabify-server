export const typeDefs = /* GraphQL */ `
  extend type Query {
    """
    Returns the full nested page tree for a project (non-archived, non-deleted).
    """
    getProjectPages(projectId: ID!): [Page!]!
  }
`;
