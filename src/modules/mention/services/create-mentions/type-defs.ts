export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    createMentions(mentions: [CreateMentionInput!]!): [Mention!]!
  }

  input CreateMentionInput {
    sourceEntityId: ID!
    sourceEntityType: String!
    targetEntityId: ID!
    targetEntityType: String!
    displayText: String!
    sourceLocation: JSON
  }
`;
