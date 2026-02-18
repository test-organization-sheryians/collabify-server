export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    updateBoardDescription(boardId: ID!, description: String): Whiteboard!
  }
`;
