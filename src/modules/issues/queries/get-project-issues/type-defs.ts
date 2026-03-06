export const typeDefs = /* GraphQL */ `
  extend type Query {
    """
    Returns all issues for a project, sorted by priority (URGENT first)
    then by position within each column.
    Optional filters: assigneeId, labelIds, priority.
    """
    getProjectIssues(
      projectId: ID!
      assigneeId: ID
      labelIds: [ID!]
      priority: IssuePriority
    ): [Issue!]!
  }

  enum IssuePriority {
    URGENT
    HIGH
    MEDIUM
    LOW
    NO_PRIORITY
  }

  type Issue {
    id: ID!
    projectId: ID!
    workspaceId: ID!
    number: Int!
    title: String!
    descriptionS3Key: String
    status: IssueStatus!
    priority: IssuePriority!
    position: Float!
    assignee: IssueUser
    labels: [IssueLabel!]!
    dueDate: DateTime
    createdBy: IssueUser!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type IssueUser {
    id: ID!
    fullName: String
    avatarUrl: String
  }
`;
