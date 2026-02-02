export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    subscribeThread(threadId: ID!): SubscribeThreadResult!
  }

  type SubscribeThreadResult {
    success: Boolean!
    threadId: ID!
    isSubscribed: Boolean!
  }
`;
