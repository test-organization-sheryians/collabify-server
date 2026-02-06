export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    closeThread(workspaceId: ID!, threadId: ID!): CloseThreadResult!
  }

  type CloseThreadResult {
    success: Boolean!
    threadId: ID!
    closedAt: DateTime!
  }
`;
