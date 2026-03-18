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
  createWorkspaceRoleTypeDefs,
  updateWorkspaceRoleTypeDefs,
  deleteWorkspaceRoleTypeDefs,
  assignRolePermissionTypeDefs,
  removeRolePermissionTypeDefs,
} from "../services";

import {
  getInviteInfoTypeDefs,
  getMyWorkspacesTypeDefs,
  getOnboardingStatusTypeDefs,
  getWorkspaceBySlugTypeDefs,
  getWorkspaceMembersTypeDefs,
  getWorkspaceByIdTypeDefs,
  getWorkspaceInvitesTypeDefs,
  getWorkspaceRolesTypeDefs,
  getRolePermissionsTypeDefs,
  getWorkspaceOverviewTypeDefs,
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

  type WorkspaceRole {
    id: ID!
    workspaceId: ID!
    name: String!
    description: String
    scopeType: String!
    isSystem: Boolean!
    rank: Int!
    createdAt: String!
    updatedAt: String!
  }

  type Permission {
    id: ID!
    resource: String!
    action: String!
    description: String
    module: String!
  }

  type RolePermission {
    roleId: ID!
    permissionId: ID!
    effect: String!
    conditions: String
    permission: Permission!
  }
`;

export const typeDefs = [
  baseTypeDefs,
  // Services
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
  createWorkspaceRoleTypeDefs,
  updateWorkspaceRoleTypeDefs,
  deleteWorkspaceRoleTypeDefs,
  assignRolePermissionTypeDefs,
  removeRolePermissionTypeDefs,

  // Queries
  getInviteInfoTypeDefs,
  getMyWorkspacesTypeDefs,
  getOnboardingStatusTypeDefs,
  getWorkspaceBySlugTypeDefs,
  getWorkspaceMembersTypeDefs,
  getWorkspaceByIdTypeDefs,
  getWorkspaceInvitesTypeDefs,
  getWorkspaceRolesTypeDefs,
  getRolePermissionsTypeDefs,
  getWorkspaceOverviewTypeDefs,
];
