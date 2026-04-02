export const typeDefs = `
  type User {
    id: ID!
    email: String!
    fullName: String
    avatarUrl: String
    bio: String
    timezone: String
    language: String
    status: String!
    createdAt: String!
    updatedAt: String!
  }

  extend type Query {
    me: User
  }
`;
