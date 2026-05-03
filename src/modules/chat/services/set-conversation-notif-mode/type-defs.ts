export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    setConversationNotifMode(
      conversationId: String!
      mode:           ConversationNotifMode!
      muteUntil:      String
    ): ConversationNotificationPreference!
  }
`;
