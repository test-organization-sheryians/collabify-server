export const typeDefs = /* GraphQL */ `
  input CreateThreadInput {
    channelId: ID!
    parentMessageId: ID!
    content: JSON!
    nonce: String
  }

  extend type Mutation {
    createThread(input: CreateThreadInput!): ChatMessage!
  }
`;
