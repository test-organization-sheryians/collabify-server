export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    unsubscribeThread(threadId: ID!): UnsubscribeThreadResult!
  }

  type UnsubscribeThreadResult {
    success: Boolean!
    threadId: ID!
    isSubscribed: Boolean!
  }
`;
