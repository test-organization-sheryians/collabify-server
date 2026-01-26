export const typeDefs = /* GraphQL */ `
  input CreateChannelInput {
    workspaceId: ID!
    projectId: ID
    name: String
    topic: String
    type: ConversationType
    memberUserIds: [ID!]
  }

  extend type Mutation {
    createChannel(input: CreateChannelInput!): Conversation!
  }
`;
