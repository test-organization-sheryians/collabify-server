export interface MemberWithRole {
  id: string;
  userId: string;
  role: string;
  roleRank: number;
}

export interface CachedWorkspace {
  id: string;
  name: string;
  slug: string;
}

export interface CachedProject {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  isArchived: boolean;
}

export interface CachedPage {
  id: string;
  projectId: string;
  isArchived: boolean;
  isLocked: boolean;
  deletedAt: string | null;
}

export interface CachedBoard {
  id: string;
  projectId: string;
  isArchived: boolean;
  isLocked: boolean;
}

export interface CachedChannel {
  id: string;
  workspaceId: string;
  isArchived: boolean;
}

export interface PublicUser {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  username: string;
}

export interface MentionedUser extends PublicUser {
  isWorkspaceMember: boolean;
}
