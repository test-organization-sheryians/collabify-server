export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    deleteIssueStatus(input: DeleteIssueStatusInput!): DeleteResult!
  }

  input DeleteIssueStatusInput {
    statusId: ID!
  }
`;
