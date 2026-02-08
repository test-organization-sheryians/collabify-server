export const typeDefs = /* GraphQL */ `
  type BoardSnapshot {
    boardId: ID!
    snapshot: String!
    lastStreamId: String
    snapshotTimestamp: DateTime
  }

  extend type Query {
    boardSnapshot(boardId: ID!): BoardSnapshot!
  }
`;
