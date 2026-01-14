export const typeDefs = `
  type Workspace {
    id: ID!
    slug: String!
    name: String!
    logoUrl: String
    domainWhitelist: String
    createdAt: String!
    updatedAt: String!
    # Add other fields as needed
  }

  type OnboardingStatus {
    hasUser: Boolean!
    hasWorkspace: Boolean!
    hasProject: Boolean!
    workspaceSlug: String
  }

  type AvailabilityResponse {
    available: Boolean!
    message: String
    reservationId: String
  }

  type InviteResponse {
    success: Boolean!
    message: String!
    invitedCount: Int!
  }

  type WorkspaceInviteInfo {
    workspaceName: String!
    workspaceLogoUrl: String
    inviterName: String
  }

  type JoinResponse {
    success: Boolean!
    message: String!
    workspaceSlug: String!
  }


  type WorkspaceMember {
    id: ID!
    role: String!
    joinedAt: String!
    user: User!
  }

  extend type Query {
    myWorkspaces: [Workspace!]!
    onboardingStatus: OnboardingStatus!
    workspaceBySlug(slug: String!): Workspace!
    getWorkspaceInviteInfo(token: String!): WorkspaceInviteInfo!
    workspaceMembers(workspaceId: ID!): [WorkspaceMember!]!
  }

  extend type Mutation {
    createOnboardingWorkspace: Workspace!
    
    checkSlugAvailability(slug: String!): AvailabilityResponse!
    
    createWorkspace(
      slug: String!
      name: String!
    ): Workspace!

    inviteToWorkspace(input: InviteToWorkspaceInput!): InviteResponse!
    acceptWorkspaceInvite(input: AcceptInviteInput!): JoinResponse!

    updateWorkspaceMemberRole(workspaceId: ID!, memberId: ID!, role: String!): WorkspaceMember!
    removeWorkspaceMember(workspaceId: ID!, memberId: ID!): InviteResponse!
  }

  input InviteToWorkspaceInput {
    workspaceId: ID!
    emails: [String!]!
  }

  input AcceptInviteInput {
    token: String!
    userId: String
    userEmail: String
  }
`;
