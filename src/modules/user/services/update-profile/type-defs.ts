export const updateProfileTypeDefs = `
  input UpdateProfileInput {
    fullName: String
    avatarUrl: String
    bio: String
    timezone: String
    language: String
  }

  extend type Mutation {
    updateProfile(input: UpdateProfileInput!): User!
  }
`;
