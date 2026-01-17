export const getInviteInfoTypeDefs = `
  type WorkspaceInviteInfo {
    workspaceName: String!
    workspaceLogoUrl: String
    inviterName: String
  }

  extend type Query {
    getWorkspaceInviteInfo(token: String!): WorkspaceInviteInfo!
  }
`;
