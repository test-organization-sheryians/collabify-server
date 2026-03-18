export const addProjectMemberTypeDefs = `
  extend type Mutation {
    addProjectMember(projectId: ID!, workspaceId: ID!, userId: ID!): ProjectMember!
  }
`;
