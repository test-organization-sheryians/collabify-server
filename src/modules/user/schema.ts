export const userTypeDefs = `
  type User {
    id: ID!
    email: String!
    fullName: String
    avatarUrl: String
    status: String!
    createdAt: String!
    updatedAt: String!
  }

  extend type Query {
    me: User
  }

  extend type Mutation {
    syncUser(clerkId: String!, email: String!, fullName: String, avatarUrl: String): User!
  }
`;
