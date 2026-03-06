export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    """
    Step 1 of 2 for uploading a file to Vault.
    Checks quota, creates a PENDING VaultFile row, returns a presigned PUT URL.
    The client must PUT the file directly to S3 using this URL, then call confirmVaultUpload.
    """
    requestVaultUpload(input: RequestVaultUploadInput!): RequestUploadResult!
  }

  input RequestVaultUploadInput {
    projectId: ID!
    workspaceId: ID!
    "null = upload to Home (root level)"
    folderId: ID
    name: String!
    mimeType: String!
    sizeBytes: Int!
  }

  type RequestUploadResult {
    fileId: ID!
    presignedUrl: String!
    expiresAt: DateTime!
  }
`;
