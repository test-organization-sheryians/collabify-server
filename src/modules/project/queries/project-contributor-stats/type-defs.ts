export const projectContributorStatsTypeDefs = /* GraphQL */ `
  extend type Query {
    projectContributorStats(projectId: ID!): [ContributorStats!]!
  }

  type ContributorStats {
    userId:    ID!
    name:      String!
    avatarUrl: String
    assigned:  Int!
    completed: Int!
  }
`;
