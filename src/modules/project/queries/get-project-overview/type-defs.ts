export const getProjectOverviewTypeDefs = /* GraphQL */ `
  extend type Query {
    projectOverview(projectId: ID!): ProjectOverview!
  }

  type ProjectOverview {
    totalIssues:       Int!
    openIssues:        Int!
    completedIssues:   Int!
    overdueIssues:     Int!
    pageCount:         Int!
    memberCount:       Int!
    issuesByStatus:    [IssueStatusCount!]!
    recentIssues:      [OverviewIssue!]!
    members:           [OverviewMember!]!
    
    issuesByPriority:  [PriorityCount!]!
    upcomingIssues:    [UpcomingIssue!]!
    recentPages:       [PagePreview!]!
    recentVaultFiles:  [VaultFilePreview!]!
    recentWhiteboards: [WhiteboardPreview!]!
    vaultUsage:        VaultUsageSummary!
    projectChannels:   [ChannelPreview!]!
  }

  type PriorityCount {
    priority: String!
    count:    Int!
  }

  type UpcomingIssue {
    id:             ID!
    number:         Int!
    title:          String!
    dueDate:        String!
    assigneeName:   String
    assigneeAvatar: String
    statusName:     String!
    statusColor:    String!
  }

  type PagePreview {
    id:            ID!
    title:         String!
    emojiIcon:     String
    updatedAt:     String!
    createdByName: String
  }

  type VaultFilePreview {
    id:            ID!
    name:          String!
    mimeType:      String!
    sizeBytes:     Float!
    createdByName: String
    createdAt:     String!
  }

  type WhiteboardPreview {
    id:           ID!
    title:        String!
    elementCount: Int!
    updatedAt:    String!
    isLocked:     Boolean!
  }

  type VaultUsageSummary {
    usedBytes: Float!
    fileCount: Int!
  }

  type ChannelPreview {
    id:        ID!
    name:      String!
    topic:     String
    updatedAt: String!
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
