export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    moveIssueStatus(input: MoveIssueStatusInput!): MoveIssueStatusResult!
  }

  input MoveIssueStatusInput {
    issueId: ID!
    statusId: ID!
    newPosition: Float
  }

  type MoveIssueStatusResult {
    issue: Issue!
  }
`;
