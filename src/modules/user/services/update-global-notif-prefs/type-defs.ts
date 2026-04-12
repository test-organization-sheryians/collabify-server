export const updateGlobalNotifPrefsTypeDefs = /* GraphQL */ `
  input UpdateGlobalNotifPrefsInput {
    emailEnabled: Boolean
    pushEnabled:  Boolean
    globalMode:   GlobalNotifMode
    muteUntil:    String
    categories:   [CategoryPreferenceInput!]
  }

  extend type Mutation {
    updateGlobalNotifPrefs(input: UpdateGlobalNotifPrefsInput!): GlobalNotificationPreference!
    setGlobalNotifMode(mode: GlobalNotifMode!): Boolean!
    pauseNotifications(until: String!): Boolean!
    resumeNotifications: Boolean!
  }
`;
