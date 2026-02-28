export const typeDefs = /* GraphQL */ `
  input CreateDmInput {
    workspaceId: ID!
    projectId: ID!
    recipientUserId: ID!
  }

  extend type Mutation {
    createDm(input: CreateDmInput!): Conversation!
  }
`;
