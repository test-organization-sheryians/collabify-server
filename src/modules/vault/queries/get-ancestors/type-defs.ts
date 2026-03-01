export const typeDefs = /* GraphQL */ `
  extend type Query {
    """
    Returns the ancestor folder chain for a given folder, ordered root → current.
    The last element is the folder itself, the first is the top-level ancestor.
    Returns [] when the folder has no parent (it is already at root level).
    Used exclusively by the vault breadcrumb (server fallback path for direct URL visits).
    """
    getVaultAncestors(folderId: ID!): [VaultFolder!]!
  }
`;
