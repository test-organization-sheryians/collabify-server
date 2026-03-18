export const updateProfileTypeDefs = `
  input UpdateProfileInput {
    fullName: String
    avatarUrl: String
  }

  extend type Mutation {
    updateProfile(input: UpdateProfileInput!): User!
  }
`;
