export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    """
    Lock owner or workspace ADMIN can unlock.
    """
    unlockPage(input: UnlockPageInput!): UnlockPageResult!
  }
  input UnlockPageInput {
    pageId: ID!
  }
  type UnlockPageResult {
    page: Page!
  }
`;
