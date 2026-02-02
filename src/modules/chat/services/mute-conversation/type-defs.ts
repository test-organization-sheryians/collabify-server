export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    muteConversation(
      conversationId: ID!
      isMuted: Boolean!
    ): MuteConversationResult!
  }

  type MuteConversationResult {
    success: Boolean!
    conversationId: ID!
    isMuted: Boolean!
  }
`;
