export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    """
    Unarchives a page. Fails if the parent is still archived.
    Child pages are NOT automatically unarchived — handle each explicitly.
    """
    unarchivePage(input: UnarchivePageInput!): UnarchivePageResult!
  }
  input UnarchivePageInput {
    pageId: ID!
  }
  type UnarchivePageResult {
    page: Page!
  }
`;
