export const getActiveContextTypeDefs = /* GraphQL */ `
  type ActiveUserContext {
    userId: ID!
    workspaceId: ID!
    projectId: ID
    workspaceRole: String
    projectRole: String
    grantedPermissions: [String!]!
    featureFlags: [ActiveFeatureFlag!]!
  }

  type ActiveFeatureFlag {
    key: String!
    enabled: Boolean!
  }

  extend type Query {
    activeContext(workspaceId: ID!, projectId: ID): ActiveUserContext!
  }
`;
