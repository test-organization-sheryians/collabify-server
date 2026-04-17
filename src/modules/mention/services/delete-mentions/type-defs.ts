export const typeDefs = `
  extend type Mutation {
    deleteMentions(mentionIds: [ID!]!): Boolean!
  }
`;
