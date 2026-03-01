export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    moveVaultFile(input: MoveVaultFileInput!): MoveFileResult!
  }

  input MoveVaultFileInput {
    fileId: ID!
    "null = move to root (Home)"
    targetFolderId: ID
  }

  type MoveFileResult {
    file: VaultFile!
  }
`;
