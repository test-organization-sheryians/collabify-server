export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    """
    Moves a page to a new position (and optionally a new parent).
    Validate no circular nesting before calling (circular guard runs server-side too).
    """
    reorderPage(input: ReorderPageInput!): ReorderPageResult!
  }
  input ReorderPageInput {
    pageId: ID!
    """
    null = move to root (remove from parent)
    """
    newParentId: ID
    newPosition: Float!
  }
  type ReorderPageResult {
    page: Page!
  }
`;
