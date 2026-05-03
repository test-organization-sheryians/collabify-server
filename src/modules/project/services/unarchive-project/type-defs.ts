export const unarchiveProjectTypeDefs = `
  extend type Mutation {
    unarchiveProject(projectId: ID!): Project!
  }
`;
