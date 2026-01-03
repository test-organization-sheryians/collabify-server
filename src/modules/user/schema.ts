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

  type Query {
    me: User
  }

  type Mutation {
    createUser(clerkId: String!, email: String!, fullName: String, avatarUrl: String): User!
  }
`;
