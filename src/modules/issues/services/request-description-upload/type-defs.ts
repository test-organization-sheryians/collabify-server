export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    """
    Step 1 of 2: reserves an S3 slot and returns a presigned PUT URL.
    """
    requestIssueDescriptionUpload(
      input: RequestIssueDescriptionUploadInput!
    ): RequestIssueDescriptionUploadResult!
  }

  input RequestIssueDescriptionUploadInput {
    issueId: ID!
    sizeBytes: Int!
  }

  type RequestIssueDescriptionUploadResult {
    presignedUrl: String!
    descriptionFileId: ID!
    expiresAt: DateTime!
  }
`;
