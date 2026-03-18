export const typeDefs = /* GraphQL */ `
  extend type Query {
    """
    Returns all labels defined in a project.
    """
    getIssueLabels(projectId: ID!): [IssueLabel!]!
  }

  type IssueLabel {
    id: ID!
    projectId: ID!
    name: String!
    color: String!
    createdAt: DateTime!
  }
`;
