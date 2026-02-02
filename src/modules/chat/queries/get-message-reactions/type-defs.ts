export const typeDefs = /* GraphQL */ `
  extend type Query {
    messageReactions(messageId: ID!): [MessageReaction!]!
  }
`;
