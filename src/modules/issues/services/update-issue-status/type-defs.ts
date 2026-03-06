export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    updateIssueStatus(input: UpdateIssueStatusInput!): UpdateIssueStatusResult!
  }

  input UpdateIssueStatusInput {
    statusId: ID!
    name: String
    color: String
    icon: String
  }

  type UpdateIssueStatusResult {
    status: IssueStatus!
  }
`;
