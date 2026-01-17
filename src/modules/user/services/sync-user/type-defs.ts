export const typeDefs = `
  extend type Mutation {
    syncUser(clerkId: String!, email: String!, fullName: String, avatarUrl: String, emailVerified: Boolean): User!
  }
`;
