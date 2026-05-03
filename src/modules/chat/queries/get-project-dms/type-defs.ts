export const typeDefs = /* GraphQL */ `
  extend type Query {
    getProjectDms(projectId: ID!, workspaceId: ID!): [ProjectDmItem!]!
  }

  """
  A 1:1 DM conversation with the other participant's profile resolved.
  The caller's own userId must be used to identify 'otherUser' on the client.
  """
  type ProjectDmItem {
    id: ID!
    otherUser: DmUserProfile!
    unreadCount: Int!
    updatedAt: DateTime!
  }

  type DmUserProfile {
    id: ID!
    fullName: String!
    email: String
    avatarUrl: String
  }
`;
