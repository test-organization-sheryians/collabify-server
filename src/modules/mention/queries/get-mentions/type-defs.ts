export const typeDefs = /* GraphQL */ `
  extend type Query {
    getMentions(sourceEntityId: ID!): [Mention!]!
  }

  type Mention {
    id: ID!
    sourceEntityId: String!
    sourceEntityType: String!
    targetEntityId: String!
    targetEntityType: String!
    displayText: String!
    sourceLocation: JSON
    tier: MentionTier!
    status: MentionStatus!
    createdAt: DateTime!
    createdById: String!
  }

  enum MentionTier {
    TIER_1
    TIER_2
    TIER_3
  }

  enum MentionStatus {
    ACTIVE
    ORPHANED
    REMOVED
  }
`;
