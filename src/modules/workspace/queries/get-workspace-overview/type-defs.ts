export const getWorkspaceOverviewTypeDefs = /* GraphQL */ `
  extend type Query {
    workspaceOverview(workspaceId: ID!): WorkspaceOverview!
  }

  type WorkspaceOverview {
    totalProjects:  Int!
    totalMembers:   Int!
    totalIssues:    Int!
    totalPages:     Int!
    totalChannels:  Int!
    activeProjects: [WorkspaceOverviewProject!]!
    recentMembers:  [WorkspaceOverviewMember!]!
    urgentIssues:   [WorkspaceOverviewIssue!]!
  }

  type WorkspaceOverviewProject {
    id:          ID!
    name:        String!
    key:         String!
    description: String
    memberCount: Int!
    openIssues:  Int!
    updatedAt:   String!
  }

  type WorkspaceOverviewMember {
    userId:   ID!
    fullName: String
    email:    String!
    avatarUrl: String
    roleName: String!
    joinedAt: String!
  }

  type WorkspaceOverviewIssue {
    id:           ID!
    number:       Int!
    title:        String!
    priority:     String!
    projectId:    ID!
    projectName:  String!
    projectKey:   String!
    assigneeId:   ID
    assigneeName: String
    dueDate:      String
  }
`;
