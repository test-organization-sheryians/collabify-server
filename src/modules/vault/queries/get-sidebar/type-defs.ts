export const typeDefs = /* GraphQL */ `
  extend type Query {
    """
    Returns sidebar data: user-pinned folders + system folders (From Chat, From Pages, etc.).
    Fetched once on Vault mount. Never re-called during folder navigation.
    """
    getVaultSidebar(projectId: ID!): VaultSidebar!
  }
`;
