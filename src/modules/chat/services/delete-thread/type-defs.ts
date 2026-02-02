export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    deleteThread(workspaceId: ID!, threadId: ID!): DeleteThreadResult!
  }

  type DeleteThreadResult {
    success: Boolean!
    threadId: ID!
  }
`;
