export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    """
    Soft-deletes a page. Fails with 409 if the page has active subscribers.
    Does not cascade to child pages — handle descendants explicitly first.
    """
    deletePage(input: DeletePageInput!): DeletePageResult!
  }

  input DeletePageInput {
    pageId: ID!
    workspaceId: ID!
  }

  type DeletePageResult {
    success: Boolean!
    pageId: ID!
  }
`;
