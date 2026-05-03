export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    """
    Soft-deletes a folder.
    cascade=false (default): returns error if folder is non-empty.
    cascade=true: recursively soft-deletes all child folders and files.
    """
    deleteVaultFolder(input: DeleteVaultFolderInput!): DeleteResult!
  }

  input DeleteVaultFolderInput {
    folderId: ID!
    cascade: Boolean
  }
`;
