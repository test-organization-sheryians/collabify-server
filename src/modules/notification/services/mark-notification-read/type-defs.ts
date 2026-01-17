export const markNotificationReadTypeDefs = `
  extend type Mutation {
    """
    Mark specific notifications as read.
    """
    markNotificationRead(ids: [ID!]!): Boolean!
  }
`;
