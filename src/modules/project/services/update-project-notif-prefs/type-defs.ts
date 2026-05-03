export const updateProjectNotifPrefsTypeDefs = /* GraphQL */ `
  extend type Mutation {
    updateProjectNotifPrefs(
      projectId: String!
      input:     UpdateScopedPreferencesInput!
    ): ScopedNotificationPreference!

    muteProject(projectId: String!, until: String): Boolean!
    unmuteProject(projectId: String!): Boolean!
  }
`;
