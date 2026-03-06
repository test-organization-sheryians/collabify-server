export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    "Soft-deletes a vault file and releases its storage quota."
    deleteVaultFile(input: DeleteVaultFileInput!): DeleteResult!
  }

  input DeleteVaultFileInput {
    fileId: ID!
  }
`;
