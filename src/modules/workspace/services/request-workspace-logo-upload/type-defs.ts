export const requestWorkspaceLogoUploadTypeDefs = `
  type WorkspaceLogoUploadPayload {
    presignedUrl: String!
    """The final S3 URL to store in Workspace.logoUrl after PUT succeeds."""
    logoUrl: String!
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
