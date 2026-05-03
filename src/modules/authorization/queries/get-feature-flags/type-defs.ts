export const getFeatureFlagsTypeDefs = /* GraphQL */ `
  type FeatureFlagRecord {
    id: ID!
    key: String!
    defaultEnabled: Boolean!
    description: String
    overrides: [FlagOverrideRecord!]!
  }

  type FlagOverrideRecord {
    id: ID!
    contextType: FlagContextType!
    contextId: ID
    enabled: Boolean!
  }

  extend type Query {
    featureFlags: [FeatureFlagRecord!]!
  }
`;
