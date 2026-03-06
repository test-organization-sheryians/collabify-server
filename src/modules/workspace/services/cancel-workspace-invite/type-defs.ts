export const cancelWorkspaceInviteTypeDefs = `
  extend type Mutation {
    cancelWorkspaceInvite(inviteId: ID!, workspaceId: ID!): Boolean!
  }
`;
