export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    renameBoard(boardId: ID!, title: String!): Whiteboard!
  }
`;
