export const requestWorkspaceLogoUploadTypeDefs = `
  type WorkspaceLogoUploadPayload {
    presignedUrl: String!
    """The S3 key to store in Workspace.logoS3Key after PUT succeeds."""
    logoS3Key: String!
    expiresAt: String!
  }

  extend type Mutation {
    requestWorkspaceLogoUpload(
      workspaceId: ID!
      mimeType: String!
      sizeBytes: Int!
    ): WorkspaceLogoUploadPayload!
  }
`;
