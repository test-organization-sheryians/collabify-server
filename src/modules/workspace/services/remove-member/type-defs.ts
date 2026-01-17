export const removeMemberTypeDefs = `
  extend type Mutation {
    removeWorkspaceMember(workspaceId: ID!, memberId: ID!): InviteResponse!
  }
`;
