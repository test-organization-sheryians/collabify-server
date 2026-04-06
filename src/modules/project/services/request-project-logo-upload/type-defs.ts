export const requestProjectLogoUploadTypeDefs = `
  type ProjectLogoUploadPayload {
    """The presigned S3 PUT URL the client uses to upload directly."""
    presignedUrl: String!
    """The final S3 URL to store in Project.logoUrl after PUT succeeds."""
    logoUrl: String!
    """ISO timestamp after which the presigned PUT URL expires."""
    expiresAt: String!
  }

  extend type Mutation {
    requestProjectLogoUpload(projectId: ID!, mimeType: String!, sizeBytes: Int!): ProjectLogoUploadPayload!
  }
`;
