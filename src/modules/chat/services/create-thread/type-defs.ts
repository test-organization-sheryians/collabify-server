export const typeDefs = /* GraphQL */ `
  input CreateThreadInput {
    workspaceId: ID!
    projectId: ID!
    conversationId: ID!
    messageId: ID!
  }

  extend type Mutation {
    createThread(input: CreateThreadInput!): Conversation!
  }
`;
