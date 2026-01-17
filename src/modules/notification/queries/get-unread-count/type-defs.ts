export const getUnreadCountTypeDefs = `
  extend type Query {
    """
    Get count of unread notifications.
    """
    unreadNotificationCount: Int!
  }
`;
