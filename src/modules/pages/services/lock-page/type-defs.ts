export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    """
    Acquires an exclusive editor lock on the page.
    Returns 423 if another user currently holds the lock.
    Lock auto-releases after 1 hour (safety net for crashed clients).
    """
    lockPage(input: LockPageInput!): LockPageResult!
  }
  input LockPageInput {
    pageId: ID!
  }
  type LockPageResult {
    page: Page!
  }
`;
