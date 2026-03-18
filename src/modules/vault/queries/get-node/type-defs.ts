export const typeDefs = /* GraphQL */ `
  extend type Query {
    """
    Returns full metadata for a single vault folder or file.
    Used for the detail/info side panel. Not used for listing.
    """
    getVaultNode(id: ID!, type: VaultNodeType!): VaultNode!
  }
`;
