export const typeDefs = /* GraphQL */ `
  input RenameChannelInput {
    channelId: ID!
    name: String!
  }

  extend type Mutation {
    renameChannel(input: RenameChannelInput!): Conversation!
  }
`;
