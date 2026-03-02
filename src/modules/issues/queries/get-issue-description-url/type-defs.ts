export const typeDefs = /* GraphQL */ `
  extend type Query {
    """
    Returns a short-lived presigned GET URL for reading an issue description from S3.
    TTL: 5 minutes. Always request fresh — never cache.
    """
    getIssueDescriptionUrl(issueId: ID!): IssueDescriptionUrl!
  }

  type IssueDescriptionUrl {
    url: String!
    expiresAt: DateTime!
  }
`;
