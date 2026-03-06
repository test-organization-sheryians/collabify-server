export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    createIssueLabel(input: CreateIssueLabelInput!): CreateIssueLabelResult!
  }

  input CreateIssueLabelInput {
    projectId: ID!
    name: String!
    color: String
  }

  type CreateIssueLabelResult {
    label: IssueLabel!
  }
`;
