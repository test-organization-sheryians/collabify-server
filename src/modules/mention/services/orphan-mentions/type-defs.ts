export const typeDefs = `
  extend type Mutation {
    orphanMentions(targetEntityId: ID!): Int!
  }
`;
