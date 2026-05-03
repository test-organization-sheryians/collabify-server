export const getUserHomeTypeDefs = `
  type WorkspaceHomeEntry {
    id: ID!
    slug: String!
    name: String!
    logoUrl: String
    memberRole: String!
  }

  type PendingInviteEntry {
    id: ID!
    token: String!
    workspaceName: String!
    role: String!
  }

  type UserHomeProfile {
    id: ID!
    fullName: String
    avatarUrl: String
    email: String!
  }

  type UserHomeData {
    user: UserHomeProfile!
    workspaces: [WorkspaceHomeEntry!]!
    pendingInvites: [PendingInviteEntry!]!
  }

  extend type Query {
    userHome: UserHomeData
  }
`;
