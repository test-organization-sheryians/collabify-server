export const getNotificationSummaryTypeDefs = /* GraphQL */ `
  type NotificationSummary {
    globalMode:   GlobalNotifMode!
    emailEnabled: Boolean!
    pushEnabled:  Boolean!
    isDndActive:  Boolean!
    dndUntil:     DateTime
    categories:   [CategoryPreferenceSetting!]!
  }

  extend type Query {
    myNotificationSummary: NotificationSummary!
  }
`;
