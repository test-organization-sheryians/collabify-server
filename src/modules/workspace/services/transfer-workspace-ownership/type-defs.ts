export const transferWorkspaceOwnershipTypeDefs = `
  extend type Mutation {
    transferWorkspaceOwnership(workspaceId: ID!, newOwnerId: ID!): WorkspaceMember!
  }
`;
