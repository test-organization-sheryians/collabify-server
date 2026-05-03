export const typeDefs = /* GraphQL */ `
  extend type Query {
    getMentionEvents(mentionId: ID!): [MentionEvent!]!
  }

  type MentionEvent {
    id: ID!
    mentionId: String!
    eventType: String!
    payload: JSON!
    actorId: String
    createdAt: DateTime!
  }
`;
