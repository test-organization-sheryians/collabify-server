export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    """
    Step 2 of 2: verifies S3 upload and activates the description.
    """
    confirmIssueDescriptionUpload(
      input: ConfirmIssueDescriptionUploadInput!
    ): ConfirmIssueDescriptionUploadResult!
  }

  input ConfirmIssueDescriptionUploadInput {
    descriptionFileId: ID!
  }

  type ConfirmIssueDescriptionUploadResult {
    issue: Issue!
  }
`;
