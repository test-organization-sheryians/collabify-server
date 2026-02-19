export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    """
    Cannot remove the page creator.
    """
    removePageCollaborator(
      input: RemovePageCollaboratorInput!
    ): RemovePageCollaboratorResult!
  }
  input RemovePageCollaboratorInput {
    pageId: ID!
    userId: ID!
  }
  type RemovePageCollaboratorResult {
    success: Boolean!
  }
`;
