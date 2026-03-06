export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    createIssueStatus(input: CreateIssueStatusInput!): CreateIssueStatusResult!
  }

  input CreateIssueStatusInput {
    projectId: ID!
    name: String!
    color: String
    icon: String
  }

  type CreateIssueStatusResult {
    status: IssueStatus!
  }
`;
