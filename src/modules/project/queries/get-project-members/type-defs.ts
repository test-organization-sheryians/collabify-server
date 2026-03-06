export const getProjectMembersTypeDefs = `
  extend type Query {
    projectMembers(projectId: ID!): [ProjectMember!]!
  }
`;
