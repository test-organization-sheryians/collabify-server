export const typeDefs = /* GraphQL */ `
  extend type Query {
    """
    Returns the immediate children (subfolders + files) of a folder.
    parentFolderId = null → Home view (root-level items with no parent).
    """
    getVaultChildren(
      projectId: ID!
      parentFolderId: ID
      cursor: ID
      limit: Int
      sortBy: VaultSortField
      sortDir: SortDirection
    ): VaultChildrenResult!
  }
`;
