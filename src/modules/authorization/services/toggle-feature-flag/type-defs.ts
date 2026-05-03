export const toggleFeatureFlagTypeDefs = /* GraphQL */ `
  input ToggleFeatureFlagInput {
    flagKey: String!
    contextType: FlagContextType!
    contextId: ID
    enabled: Boolean!
  }

  enum FlagContextType {
    GLOBAL
    WORKSPACE
    PROJECT
    USER
  }

  type ToggleFlagResult {
    success: Boolean!
    flagKey: String!
    enabled: Boolean!
  }

  extend type Mutation {
    toggleFeatureFlag(input: ToggleFeatureFlagInput!): ToggleFlagResult!
  }
`;
