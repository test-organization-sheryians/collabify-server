export const getWorkspaceMembersTypeDefs = `
  type WorkspaceMember {
    id: ID!
    role: String!
    roleId: ID!
    roleRank: Int!
    joinedAt: String!
    user: User!
  }

  extend type Query {
    workspaceMembers(workspaceId: ID!): [WorkspaceMember!]!
  }
`;
