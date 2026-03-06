export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    deleteIssue(input: DeleteIssueInput!): DeleteResult!
  }

  input DeleteIssueInput {
    issueId: ID!
  }
`;
