export const typeDefs = /* GraphQL */ `
  extend type Query {
    getBoard(boardId: ID!): Whiteboard
  }
`;
