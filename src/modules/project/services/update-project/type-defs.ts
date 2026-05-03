export const updateProjectTypeDefs = `
  input UpdateProjectInput {
    name: String
    description: String
    isPrivate: Boolean
    logoS3Key: String
    key: String
  }

  extend type Mutation {
    updateProject(projectId: ID!, input: UpdateProjectInput!): Project!
  }
`;
