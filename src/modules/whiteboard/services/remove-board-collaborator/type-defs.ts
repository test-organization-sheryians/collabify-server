export const typeDefs = /* GraphQL */ `
  type RemoveBoardCollaboratorResult {
    success: Boolean!
  }

  extend type Mutation {
    removeBoardCollaborator(
      boardId: ID!
      userId: ID!
    ): RemoveBoardCollaboratorResult!
  }
`;
