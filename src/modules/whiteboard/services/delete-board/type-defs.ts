export const typeDefs = /* GraphQL */ `
  type DeleteBoardResult {
    success: Boolean!
    boardId: ID!
  }

  extend type Mutation {
    deleteBoard(boardId: ID!): DeleteBoardResult!
  }
`;
