export const getPublicUserTypeDefs = `
  type PublicUser {
    id: ID!
    fullName: String
    avatarUrl: String
    email: String!
  }

  extend type Query {
    user(userId: ID!): PublicUser
  }
`;
