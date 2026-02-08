export const typeDefs = /* GraphQL */ `
  extend type Query {
    projectBoards(projectId: ID!, limit: Int, cursor: ID): BoardConnection!
  }
`;
