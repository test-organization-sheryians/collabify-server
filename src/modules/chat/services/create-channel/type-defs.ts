export const typeDefs = /* GraphQL */ `
  input CreateChannelInput {
    workspaceId: ID!
    projectId: ID
    name: String
    topic: String
    type: ChannelType
    memberUserIds: [ID!]
  }

  extend type Mutation {
    createChannel(input: CreateChannelInput!): ChatChannel!
  }
`;
