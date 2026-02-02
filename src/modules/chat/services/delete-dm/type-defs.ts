export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    deleteDm(workspaceId: ID!, dmId: ID!): DeleteDmResult!
  }

  type DeleteDmResult {
    success: Boolean!
    dmId: ID!
  }
`;
