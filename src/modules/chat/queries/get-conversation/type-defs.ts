export const typeDefs = /* GraphQL */ `
  extend type Query {
    getConversation(conversationId: ID!): ConversationDetails!
  }

  type ConversationDetails {
    id: ID!
    type: ConversationType!
    name: String
    description: String
    isPublic: Boolean!
    workspaceId: ID!
    projectId: ID
    parentMessageId: ID
    createdBy: ID
    memberCount: Int!
    unreadCount: Int!
    members: [ConversationMemberDetails!]!
    lastMessage: LastMessagePreview
    createdAt: DateTime!
    updatedAt: DateTime!
    deletedAt: DateTime
  }

  type ConversationMemberDetails {
    userId: ID!
    role: String!
    isMuted: Boolean!
    joinedAt: DateTime!
    user: UserBasic!
  }

  type UserBasic {
    id: ID!
    fullName: String!
    email: String!
    avatarUrl: String
  }
`;
