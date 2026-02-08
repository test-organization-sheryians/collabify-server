export const typeDefs = /* GraphQL */ `
  type AddBoardCollaboratorsResult {
    success: Boolean!
    addedCount: Int!
    skippedCount: Int!
  }

  extend type Mutation {
    addBoardCollaborators(
      boardId: ID!
      userIds: [ID!]!
    ): AddBoardCollaboratorsResult!
  }
`;
