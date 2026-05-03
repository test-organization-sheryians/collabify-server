export const updateMemberRoleTypeDefs = `
  extend type Mutation {
    updateWorkspaceMemberRole(workspaceId: ID!, memberId: ID!, roleId: ID!): WorkspaceMember!
  }
`;
