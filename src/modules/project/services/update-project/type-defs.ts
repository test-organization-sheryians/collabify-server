export const updateProjectTypeDefs = `
  input UpdateProjectInput {
    name: String
    description: String
    isPrivate: Boolean
  }

  extend type Mutation {
    updateProject(projectId: ID!, input: UpdateProjectInput!): Project!
  }
`;
