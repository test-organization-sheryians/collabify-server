export const getProjectOverviewTypeDefs = /* GraphQL */ `
  extend type Query {
    projectOverview(projectId: ID!): ProjectOverview!
  }

  type ProjectOverview {
    totalIssues:     Int!
    openIssues:      Int!
    completedIssues: Int!
    overdueIssues:   Int!
    pageCount:       Int!
    issuesByStatus:  [IssueStatusCount!]!
    recentIssues:    [OverviewIssue!]!
    members:         [OverviewMember!]!
  }

  type IssueStatusCount {
    statusId:   ID!
    name:       String!
    color:      String!
    icon:       String
    issueCount: Int!
  }

  type OverviewIssue {
    id:             ID!
    number:         Int!
    title:          String!
    priority:       String!
    dueDate:        String
    updatedAt:      String!
    statusName:     String!
    statusColor:    String!
    assigneeId:     ID
    assigneeName:   String
    assigneeAvatar: String
  }

  type OverviewMember {
    userId:    ID!
    name:      String!
    email:     String!
    avatarUrl: String
    roleName:  String
    roleRank:  Int
    joinedAt:  String!
  }
`;
