import {
  acceptInviteTypeDefs,
  checkSlugAvailabilityTypeDefs,
  createOnboardingWorkspaceTypeDefs,
  createWorkspaceTypeDefs,
  inviteToWorkspaceTypeDefs,
  leaveWorkspaceTypeDefs,
  cancelWorkspaceInviteTypeDefs,
  resendWorkspaceInviteTypeDefs,
  deleteWorkspaceTypeDefs,
  transferWorkspaceOwnershipTypeDefs,
  removeMemberTypeDefs,
  updateMemberRoleTypeDefs,
  updateWorkspaceTypeDefs,
} from "../services";

import {
  getInviteInfoTypeDefs,
  getMyWorkspacesTypeDefs,
  getOnboardingStatusTypeDefs,
  getWorkspaceBySlugTypeDefs,
  getWorkspaceMembersTypeDefs,
  getWorkspaceByIdTypeDefs,
  getWorkspaceInvitesTypeDefs,
} from "../queries";

const baseTypeDefs = `
  type Workspace {
    id: ID!
    slug: String!
    name: String!
    logoUrl: String
    domainWhitelist: String
    createdAt: String!
    updatedAt: String!
  }
`;

export const typeDefs = [
  baseTypeDefs,
  // Features
  acceptInviteTypeDefs,
  checkSlugAvailabilityTypeDefs,
  createOnboardingWorkspaceTypeDefs,
  createWorkspaceTypeDefs,
  inviteToWorkspaceTypeDefs,
  leaveWorkspaceTypeDefs,
  cancelWorkspaceInviteTypeDefs,
  resendWorkspaceInviteTypeDefs,
  deleteWorkspaceTypeDefs,
  transferWorkspaceOwnershipTypeDefs,
  removeMemberTypeDefs,
  updateMemberRoleTypeDefs,
  updateWorkspaceTypeDefs,

  // Queries
  getInviteInfoTypeDefs,
  getMyWorkspacesTypeDefs,
  getOnboardingStatusTypeDefs,
  getWorkspaceBySlugTypeDefs,
  getWorkspaceMembersTypeDefs,
  getWorkspaceByIdTypeDefs,
  getWorkspaceInvitesTypeDefs,
];
