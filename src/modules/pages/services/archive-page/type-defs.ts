export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    """
    Archives a page and all its descendants.
    """
    archivePage(input: ArchivePageInput!): ArchivePageResult!
  }
  input ArchivePageInput {
    pageId: ID!
  }
  type ArchivePageResult {
    page: Page!
  }
`;
