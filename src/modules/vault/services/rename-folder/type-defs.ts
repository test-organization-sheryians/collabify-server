export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    renameVaultFolder(input: RenameVaultFolderInput!): RenameFolderResult!
  }

  input RenameVaultFolderInput {
    folderId: ID!
    name: String!
  }

  type RenameFolderResult {
    folder: VaultFolder!
  }
`;
