export const removeProjectMemberTypeDefs = `
  extend type Mutation {
    removeProjectMember(projectId: ID!, workspaceId: ID!, userId: ID!): Boolean!
  }
`;
