export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    updateIssue(input: UpdateIssueInput!): UpdateIssueResult!
  }

  input UpdateIssueInput {
    issueId: ID!
    title: String
    priority: IssuePriority
    assigneeId: ID
    labelIds: [ID!]
    dueDate: DateTime
  }

  type UpdateIssueResult {
    issue: Issue!
  }
`;
