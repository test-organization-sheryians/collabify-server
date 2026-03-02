export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    updateIssueLabel(input: UpdateIssueLabelInput!): UpdateIssueLabelResult!
  }

  input UpdateIssueLabelInput {
    labelId: ID!
    name: String
    color: String
  }

  type UpdateIssueLabelResult {
    label: IssueLabel!
  }
`;
