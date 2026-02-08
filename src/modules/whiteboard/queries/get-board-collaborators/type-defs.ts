export const typeDefs = /* GraphQL */ `
  extend type Query {
    boardCollaborators(boardId: ID!): [BoardCollaborator!]!
  }
`;
