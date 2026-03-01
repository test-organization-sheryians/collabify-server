export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    pinVaultFolder(input: PinVaultFolderInput!): PinFolderResult!
  }

  input PinVaultFolderInput {
    projectId: ID!
    folderId: ID!
  }

  type PinFolderResult {
    folder: VaultFolder!
  }
`;
