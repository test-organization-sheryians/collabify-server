export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    """
    Step 2 of 2 for uploading a file to Vault.
    Verifies the S3 object (size + MIME), sets the file to ACTIVE, and updates storage usage.
    """
    confirmVaultUpload(input: ConfirmVaultUploadInput!): ConfirmUploadResult!
  }

  input ConfirmVaultUploadInput {
    fileId: ID!
  }

  type ConfirmUploadResult {
    file: VaultFile!
  }
`;
