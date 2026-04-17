export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    updateMention(input: UpdateMentionInput!): Mention!
  }

  input UpdateMentionInput {
    mentionId: ID!
    displayText: String
    sourceLocation: JSON
  }
`;
