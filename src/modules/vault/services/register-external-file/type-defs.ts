export const registerExternalFileTypeDefs = /* GraphQL */ `
  input RegisterExternalFileInput {
    workspaceId: ID!
    projectId:   ID!
    """
    Which module is uploading the file. Determines the system folder it lands in.
    """
    source:      VaultFileSource!
    """
    ID of the originating entity (conversationId, pageId, boardId, issueId).
    Nullable — may not yet exist when uploading before the entity is created.
    """
    sourceId:    ID
    name:        String!
    mimeType:    String!
    """
    File size in bytes. Use Float to stay JS-safe (no BigInt serialisation issues).
    """
    sizeBytes:   Float!
    """
    Optional override folder. Defaults to the source module's system folder.
    """
    folderId:    ID
  }

  """
  Returned by registerExternalFile and requestVaultUpload.
  The client must PUT the file bytes to presignedUrl, then call confirmVaultUpload.
  """
  type RegisterExternalFileResult {
    fileId:       ID!
    presignedUrl: String!
    expiresAt:    DateTime!
  }

  extend type Mutation {
    """
    Register a file upload initiated outside the standard Vault UI flow.
    Used by Chat (attachments), Pages/Issues (BlockNote uploadFile adapter),
    and Whiteboard (Excalidraw onAddFile).

    Enforces storage quota before issuing the presigned URL.
    Creates a PENDING VaultFile row. The caller must:
      1. PUT bytes to presignedUrl
      2. Call confirmVaultUpload(fileId) to activate
    """
    registerExternalFile(input: RegisterExternalFileInput!): RegisterExternalFileResult!
  }
`;
