export const typeDefs = /* GraphQL */ `
  extend type Query {
    """
    Returns a short-lived presigned GET URL for downloading or previewing a vault file.
    URL is valid for 5 minutes. Never cache — always request fresh.
    """
    getVaultDownloadUrl(fileId: ID!): VaultDownloadUrl!
  }
`;
