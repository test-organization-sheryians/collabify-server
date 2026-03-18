export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    createIssue(input: CreateIssueInput!): CreateIssueResult!
  }

  input CreateIssueInput {
    projectId: ID!
    statusId: ID!
    title: String!
    priority: IssuePriority
    assigneeId: ID
    labelIds: [ID!]
    dueDate: DateTime
  }

  type CreateIssueResult {
    issue: Issue!
  }
`;
