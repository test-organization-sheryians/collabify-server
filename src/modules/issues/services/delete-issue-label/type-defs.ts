export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    deleteIssueLabel(input: DeleteIssueLabelInput!): DeleteResult!
  }

  input DeleteIssueLabelInput {
    labelId: ID!
  }
`;
