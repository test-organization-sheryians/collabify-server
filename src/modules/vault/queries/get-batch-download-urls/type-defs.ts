export const getBatchDownloadUrlsTypeDefs = /* GraphQL */ `
  """
  Result entry for a single file in a batch download URL request.
  Clients must check status before using the url.
  """
  type VaultBatchDownloadResult {
    fileId:    ID!
    """
    Presigned GET URL valid for 1 hour. Null when status != ACTIVE.
    """
    url:       String
    """
    ACTIVE    — url is valid, render normally
    DELETED   — file was removed; render tombstone ("Attachment deleted")
    PENDING   — upload not yet confirmed; render placeholder
    FORBIDDEN — caller is not a member of this file's project
    """
    status:    String!
    name:      String!
    mimeType:  String!
    sizeBytes: Float!
  }

  extend type Query {
    """
    Batch-fetch presigned GET URLs for a list of fileIds.
    Returns one result entry per fileId in the same order as the input.
    Failed or deleted files return a non-null entry with status != ACTIVE.

    Max 50 fileIds per call.
    """
    getBatchDownloadUrls(fileIds: [ID!]!): [VaultBatchDownloadResult!]!
  }
`;
