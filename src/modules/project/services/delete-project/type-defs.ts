export const deleteProjectTypeDefs = `
  extend type Mutation {
    deleteProject(projectId: ID!): Boolean!
  }
`;
