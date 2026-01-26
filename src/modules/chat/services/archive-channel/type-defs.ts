export const typeDefs = /* GraphQL */ `
  input ArchiveChannelInput {
    channelId: ID!
  }

  extend type Mutation {
    archiveChannel(input: ArchiveChannelInput!): Conversation!
  }
`;
