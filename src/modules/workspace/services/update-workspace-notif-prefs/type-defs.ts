export const updateWorkspaceNotifPrefsTypeDefs = /* GraphQL */ `
  extend type Mutation {
    updateWorkspaceNotifPrefs(
      workspaceId: String!
      input:       UpdateScopedPreferencesInput!
    ): ScopedNotificationPreference!

    muteWorkspace(workspaceId: String!, until: String): Boolean!
    unmuteWorkspace(workspaceId: String!): Boolean!
  }
`;
