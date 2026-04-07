export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    updateIssue(input: UpdateIssueInput!): UpdateIssueResult!
  }

  input UpdateIssueInput {
    issueId: ID!
    title: String
    statusId: ID
    priority: IssuePriority
    assigneeId: ID
    labelIds: [ID!]
    dueDate: DateTime
  }

  type UpdateIssueResult {
    issue: Issue!
  }
`;
