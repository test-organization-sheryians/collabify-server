export interface AuthGateInvalidator {
  workspaceMember(workspaceId: string, userId: string): Promise<void>;
  projectMember(projectId: string, userId: string): Promise<void>;
  pageCollaborator(pageId: string, userId: string): Promise<void>;
  boardCollaborator(boardId: string, userId: string): Promise<void>;
  channelMember(channelId: string, userId: string): Promise<void>;
  userProfile(userId: string): Promise<void>;
  resourceState(
    resourceType: "page" | "board",
    resourceId: string
  ): Promise<void>;
}

export interface PermissionCacheInvalidator {
  invalidateUser(userId: string, scopeId: string): Promise<void>;
  invalidateUserAll(userId: string): Promise<void>;
  invalidateRole(roleId: string, memberUserIds: string[]): Promise<void>;
  invalidateResource(
    resource: string,
    resourceId: string,
    affectedUserIds: string[]
  ): Promise<void>;
}
