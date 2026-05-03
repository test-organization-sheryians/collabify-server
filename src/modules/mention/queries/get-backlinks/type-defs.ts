export const typeDefs = /* GraphQL */ `
  extend type Query {
    getBacklinks(targetEntityId: ID!, limit: Int, cursor: ID, filters: BacklinkFilters): BacklinkResult!
  }

  input BacklinkFilters {
    sourceType: String
    actorId: String
    dateFrom: DateTime
    dateTo: DateTime
  }

  type Backlink {
    id: ID!
    sourceEntityId: String!
    sourceEntityType: String!
    targetEntityId: String!
    targetEntityType: String!
    context: String
    createdAt: DateTime!
    sourceMention: Mention!
  }

  type BacklinkResult {
    backlinks: [Backlink!]!
    total: Int!
    hasMore: Boolean!
  }
`;
