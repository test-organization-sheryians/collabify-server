export const typeDefs = /* GraphQL */ `
  extend type Query {
    """
    Returns current storage usage for the project and its workspace.
    Poll every 60 seconds + invalidate after uploads/deletions.
    """
    getVaultUsage(projectId: ID!): VaultUsage!
  }
`;
