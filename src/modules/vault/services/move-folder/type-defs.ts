export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    moveVaultFolder(input: MoveVaultFolderInput!): MoveFolderResult!
  }

  input MoveVaultFolderInput {
    folderId: ID!
    "null = move to root (Home)"
    targetParentFolderId: ID
  }

  type MoveFolderResult {
    folder: VaultFolder!
  }
`;
