export const typeDefs = /* GraphQL */ `
  type BoardConnection {
    boards: [Whiteboard!]!
    nextCursor: ID
  }

  extend type Query {
    userBoards(workspaceId: ID!, limit: Int, cursor: ID): BoardConnection!
  }
`;
