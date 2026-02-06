export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    reopenThread(workspaceId: ID!, threadId: ID!): ReopenThreadResult!
  }

  type ReopenThreadResult {
    success: Boolean!
    threadId: ID!
  }
`;
