export const getWorkspaceMembersTypeDefs = `
  type WorkspaceMember {
    id: ID!
    role: String!
    joinedAt: String!
    user: User!
  }

  extend type Query {
    workspaceMembers(workspaceId: ID!): [WorkspaceMember!]!
  }
`;
