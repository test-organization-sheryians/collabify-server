export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    reorderIssueStatus(
      input: ReorderIssueStatusInput!
    ): ReorderIssueStatusResult!
  }

  input ReorderIssueStatusInput {
    statusId: ID!
    newPosition: Float!
  }

  type ReorderIssueStatusResult {
    status: IssueStatus!
  }
`;
