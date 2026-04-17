export const typeDefs = `
  extend type Mutation {
    deleteMentionsBySource(sourceEntityId: ID!): Int!
  }
`;
