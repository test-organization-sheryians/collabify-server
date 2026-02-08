export const typeDefs = /* GraphQL */ `
  input CreateBoardInput {
    workspaceId: ID!
    projectId: ID
    title: String!
    description: String
  }

  extend type Mutation {
    createBoard(input: CreateBoardInput!): Whiteboard!
  }
`;
