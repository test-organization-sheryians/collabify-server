export const typeDefs = /* GraphQL */ `
  extend type Query {
    """
    Returns full detail for a single issue. Used when opening the issue modal.
    """
    getIssue(issueId: ID!): Issue!
  }
`;
