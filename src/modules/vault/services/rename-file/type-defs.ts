export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    "Renames a file. S3 key is unchanged — only the display name is updated."
    renameVaultFile(input: RenameVaultFileInput!): RenameFileResult!
  }

  input RenameVaultFileInput {
    fileId: ID!
    name: String!
  }

  type RenameFileResult {
    file: VaultFile!
  }
`;
