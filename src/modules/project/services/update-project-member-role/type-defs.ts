export const updateProjectMemberRoleTypeDefs = `
  extend type Mutation {
    updateProjectMemberRole(projectId: ID!, workspaceId: ID!, userId: ID!, roleId: ID!): ProjectMember!
  }
`;
