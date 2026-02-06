export const typeDefs = /* GraphQL */ `
  extend type Query {
    reactionUsers(
      messageId: ID!
      emoji: String!
      cursor: Int
    ): ReactionUsersConnection!
  }
`;
