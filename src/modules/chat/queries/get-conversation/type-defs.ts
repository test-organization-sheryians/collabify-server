export const typeDefs = /* GraphQL */ `
  extend type Query {
    getConversation(conversationId: ID!): Conversation!
  }
`;
