export const typeDefs = `
  input CreateProjectInput {
    name: String!
    slug: String # Optional, auto-generated if missing
    description: String
  }

  extend type Mutation {
    createProject(workspaceId: ID!, input: CreateProjectInput!): Project!
  }
`;
