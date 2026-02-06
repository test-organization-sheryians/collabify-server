export const typeDefs = /* GraphQL */ `
  extend type Query {
    getDmByUsers(
      workspaceId: ID!
      projectId: ID!
      otherUserId: ID!
    ): DmConversation
  }

  type DmConversation {
    id: ID!
    workspaceId: ID!
    projectId: ID!
    type: ConversationType!
    memberCount: Int!
    members: [DmMember!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type DmMember {
    userId: ID!
    user: UserBasic!
  }
`;
