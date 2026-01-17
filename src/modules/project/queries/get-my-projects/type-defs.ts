export const typeDefs = `
  extend type Query {
    myProjects(workspaceId: ID!): [Project!]!
  }
`;
