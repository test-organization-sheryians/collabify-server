export const getWorkspaceUserTypeDefs = `
  extend type Query {
    workspaceUser(workspaceId: ID!, userId: ID!): WorkspaceMember
  }
`;
