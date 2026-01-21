export const typeDefs = /* GraphQL */ `
  extend type Query {
    getMessageById(messageId: ID!): ChatMessage
  }
`;
