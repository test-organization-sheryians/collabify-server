import type { Redis } from "ioredis";
import type {
  AuthGateInvalidator,
  PermissionCacheInvalidator,
} from "../types/invalidator-types";
import { invalidateWorkspaceMember } from "./workspace-invalidator";
import { invalidateProjectMember } from "./project-invalidator";
import { invalidatePageCollaborator } from "./page-invalidator";
import { invalidateBoardCollaborator } from "./board-invalidator";
import { invalidateChannelMember } from "./channel-invalidator";
import { invalidateUserProfile } from "./user-invalidator";
import { invalidateResourceState } from "./resource-invalidator";
import { PermissionInvalidator } from "./permission-invalidator";

/**
 * Invalidator — unified facade implementing both AuthGateInvalidator
 * and PermissionCacheInvalidator interfaces.
 *
 * Single import point for all mutation handlers:
 *   ctx.auth.invalidate.workspaceMember(wid, uid)
 *   ctx.permissions.invalidate.invalidateUser(uid, scopeId)
 */
export class Invalidator
  implements AuthGateInvalidator, PermissionCacheInvalidator
{
  private readonly permInvalidator: PermissionInvalidator;

  constructor(private readonly redis: Redis) {
    this.permInvalidator = new PermissionInvalidator(redis);
  }

  // ── AuthGateInvalidator ───────────────────────────────────────────────────

  workspaceMember(workspaceId: string, userId: string): Promise<void> {
    return invalidateWorkspaceMember(workspaceId, userId, this.redis);
  }

  projectMember(projectId: string, userId: string): Promise<void> {
    return invalidateProjectMember(projectId, userId, this.redis);
  }

  pageCollaborator(pageId: string, userId: string): Promise<void> {
    return invalidatePageCollaborator(pageId, userId, this.redis);
  }

  boardCollaborator(boardId: string, userId: string): Promise<void> {
    return invalidateBoardCollaborator(boardId, userId, this.redis);
  }

  channelMember(channelId: string, userId: string): Promise<void> {
    return invalidateChannelMember(channelId, userId, this.redis);
  }

  userProfile(userId: string): Promise<void> {
    return invalidateUserProfile(userId, this.redis);
  }

  resourceState(
    resourceType: "page" | "board",
    resourceId: string
  ): Promise<void> {
    return invalidateResourceState(resourceType, resourceId, this.redis);
  }

  // ── PermissionCacheInvalidator ────────────────────────────────────────────

  invalidateUser(userId: string, scopeId: string): Promise<void> {
    return this.permInvalidator.invalidateUser(userId, scopeId);
  }

  invalidateUserAll(userId: string): Promise<void> {
    return this.permInvalidator.invalidateUserAll(userId);
  }

  invalidateRole(roleId: string, memberUserIds: string[]): Promise<void> {
    return this.permInvalidator.invalidateRole(roleId, memberUserIds);
  }

  invalidateResource(
    resource: string,
    resourceId: string,
    affectedUserIds: string[]
  ): Promise<void> {
    return this.permInvalidator.invalidateResource(
      resource,
      resourceId,
      affectedUserIds
    );
  }
}
