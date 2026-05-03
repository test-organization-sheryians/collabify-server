export const getMentionsBySourceIdsTypeDef =  /* GraphQL */ `
  extend type Query {
    getMentionsBySourceIds(sourceIds: [String!]!): [MentionResult!]!
  }

  type MentionResult {
    sourceId: String!
    mentions: [SourceMention!]!
  }

  type SourceMention {
    id: ID!
    targetEntityId: String!
    targetEntityType: String!
    displayText: String!
  }
`
