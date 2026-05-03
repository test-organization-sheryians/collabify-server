export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    updatePageDetails(input: UpdatePageDetailsInput!): UpdatePageDetailsResult!
  }

  input UpdatePageDetailsInput {
    pageId: ID!
    """
    Emoji character to set as the page icon. Pass null to remove.
    """
    emoji: String
    """
    Permanent vault proxy URL for the cover image. Pass null to remove.
    """
    coverImageUrl: String
  }

  type UpdatePageDetailsResult {
    page: Page!
  }
`;
