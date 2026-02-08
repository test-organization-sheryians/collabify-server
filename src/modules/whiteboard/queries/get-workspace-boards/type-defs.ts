export const typeDefs = /* GraphQL */ `
  extend type Query {
    workspaceBoards(
      workspaceId: ID!
      includeArchived: Boolean
      limit: Int
      cursor: ID
    ): BoardConnection!
  }
`;
