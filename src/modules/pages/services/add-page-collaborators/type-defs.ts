export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    """
    Upsert-semantics: can be used for both inviting and changing roles.
    """
    addPageCollaborators(
      input: AddPageCollaboratorsInput!
    ): AddPageCollaboratorsResult!
  }
  input AddPageCollaboratorsInput {
    pageId: ID!
    collaborators: [PageCollaboratorInput!]!
  }
  input PageCollaboratorInput {
    userId: ID!
    role: PageRole!
  }
  type AddPageCollaboratorsResult {
    addedCollaborators: [PageCollaborator!]!
  }
`;
