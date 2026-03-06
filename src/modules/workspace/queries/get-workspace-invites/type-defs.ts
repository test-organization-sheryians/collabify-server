export const getWorkspaceInvitesTypeDefs = `
  type WorkspaceInvite {
    id: ID!
    email: String!
    role: String!
    expiresAt: String!
    createdAt: String!
  }

  extend type Query {
    workspaceInvites(workspaceId: ID!): [WorkspaceInvite!]!
  }
`;
