import {
  acceptInviteTypeDefs,
  checkSlugAvailabilityTypeDefs,
  createOnboardingWorkspaceTypeDefs,
  createWorkspaceTypeDefs,
  inviteToWorkspaceTypeDefs,
  removeMemberTypeDefs,
  updateMemberRoleTypeDefs,
} from "../../services";

import {
  getInviteInfoTypeDefs,
  getMyWorkspacesTypeDefs,
  getOnboardingStatusTypeDefs,
  getWorkspaceBySlugTypeDefs,
  getWorkspaceMembersTypeDefs,
} from "../../queries";

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
  removeMemberTypeDefs,
  updateMemberRoleTypeDefs,

  // Queries
  getInviteInfoTypeDefs,
  getMyWorkspacesTypeDefs,
  getOnboardingStatusTypeDefs,
  getWorkspaceBySlugTypeDefs,
  getWorkspaceMembersTypeDefs,
];
