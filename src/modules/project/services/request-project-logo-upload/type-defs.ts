export const requestProjectLogoUploadTypeDefs = `
  type ProjectLogoUploadPayload {
    """The presigned S3 PUT URL the client uses to upload directly."""
    presignedUrl: String!
    """The S3 key to store in Project.logoS3Key after PUT succeeds."""
    logoS3Key: String!
    """ISO timestamp after which the presigned PUT URL expires."""
    expiresAt: String!
  }

  extend type Mutation {
    requestProjectLogoUpload(projectId: ID!, mimeType: String!, sizeBytes: Int!): ProjectLogoUploadPayload!
  }
`;
