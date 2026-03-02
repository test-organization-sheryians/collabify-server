export const typeDefs = /* GraphQL */ `
  extend type Query {
    """
    Returns all Kanban columns for a project, ordered by position.
    """
    getIssueStatuses(projectId: ID!): [IssueStatus!]!
  }

  type IssueStatus {
    id: ID!
    projectId: ID!
    name: String!
    color: String!
    icon: String
    position: Float!
    isSystem: Boolean!
    issueCount: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }
`;
