export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    renamePage(input: RenamePageInput!): RenamePageResult!
  }

  input RenamePageInput {
    pageId: ID!
    title: String!
  }

  type RenamePageResult {
    page: Page!
  }
`;
