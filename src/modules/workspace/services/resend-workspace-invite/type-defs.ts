export const resendWorkspaceInviteTypeDefs = `
  extend type Mutation {
    resendWorkspaceInvite(inviteId: ID!, workspaceId: ID!): Boolean!
  }
`;
