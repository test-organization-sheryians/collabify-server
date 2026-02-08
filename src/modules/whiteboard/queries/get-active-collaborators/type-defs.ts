export const typeDefs = /* GraphQL */ `
  type CursorPosition {
    x: Float!
    y: Float!
  }

  type ActiveCollaborator {
    userId: ID!
    connectionId: ID!
    joinedAt: DateTime!
    lastSeenAt: DateTime!
    cursorPosition: CursorPosition
  }

  extend type Query {
    activeCollaborators(boardId: ID!): [ActiveCollaborator!]!
  }
`;
