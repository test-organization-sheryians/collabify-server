export const typeDefs = /* GraphQL */ `
  input CreateGroupInput {
    workspaceId: ID!
    projectId: ID!
    name: String!
    memberUserIds: [ID!]!
  }

  extend type Mutation {
    createGroup(input: CreateGroupInput!): Conversation!
  }
`;
