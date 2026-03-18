export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    reorderIssue(input: ReorderIssueInput!): ReorderIssueResult!
  }

  input ReorderIssueInput {
    issueId: ID!
    newPosition: Float!
  }

  type ReorderIssueResult {
    issue: Issue!
  }
`;
