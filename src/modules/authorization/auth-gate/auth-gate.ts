import type { Redis } from "ioredis";
import type { PrismaClient } from "@prisma/client";
import type {
  MemberWithRole,
  CachedWorkspace,
  CachedProject,
  CachedPage,
  CachedBoard,
  CachedChannel,
  PublicUser,
  MentionedUser,
} from "../types/auth-gate-types";
import { AppError } from "@/shared/errors";

import { isWorkspaceMember } from "../checks/is-workspace-member";
import { isWorkspaceAdminOrAbove } from "../checks/is-workspace-admin";
import { isWorkspaceOwner } from "../checks/is-workspace-owner";
import { getWorkspaceMemberWithRole } from "../checks/get-workspace-member";
import { getWorkspace } from "../checks/get-workspace";
import { isProjectMember } from "../checks/is-project-member";
import { isProjectManager } from "../checks/is-project-manager";
import { getProject } from "../checks/get-project";
import { isPageCollaborator } from "../checks/is-page-collaborator";
import { getPage } from "../checks/get-page";
import { isBoardCollaborator } from "../checks/is-board-collaborator";
import { getBoard } from "../checks/get-board";
import { isChannelMember } from "../checks/is-channel-member";
import { getChannel } from "../checks/get-channel";
import { getUser } from "../checks/get-user";
import { getUsersByIds } from "../checks/get-users-by-ids";
import { resolveMentions } from "../checks/resolve-mentions";
import { Invalidator } from "../invalidation/invalidator";

/**
 * AuthGate — instantiated once per request via context factory.
 *
 * Thin wiring layer over checks/*. Contains NO logic — all resolution
 * is delegated to the individual check files. Exposes three method families:
 *
 *   assert*  — throw AppError.forbidden() if check fails
 *   is*      — return boolean (no throw)
 *   get*     — return cached entity or null
 *   invalidate — sub-object for cache invalidation after mutations
 */
export class AuthGate {
  public readonly userId: string;
  public readonly invalidate: Invalidator;

  constructor(
    userId: string,
    private readonly db: PrismaClient,
    private readonly redis: Redis
  ) {
    this.userId = userId;
    this.invalidate = new Invalidator(redis);
  }

  // ── Assert methods (throw on false) ──────────────────────────────────────

  async assertWorkspaceMember(workspaceId: string): Promise<void> {
    const ok = await isWorkspaceMember(
      workspaceId,
      this.userId,
      this.redis,
      this.db
    );
    if (!ok)
      throw AppError.forbidden("You are not a member of this workspace.");
  }

  async assertWorkspaceAdminOrAbove(workspaceId: string): Promise<void> {
    const ok = await isWorkspaceAdminOrAbove(
      workspaceId,
      this.userId,
      this.redis,
      this.db
    );
    if (!ok) throw AppError.forbidden("Admin or owner access required.");
  }

  async assertWorkspaceOwner(workspaceId: string): Promise<void> {
    const ok = await isWorkspaceOwner(
      workspaceId,
      this.userId,
      this.redis,
      this.db
    );
    if (!ok) throw AppError.forbidden("Owner access required.");
  }

  async assertProjectMember(projectId: string): Promise<void> {
    const ok = await isProjectMember(
      projectId,
      this.userId,
      this.redis,
      this.db
    );
    if (!ok) throw AppError.forbidden("You are not a member of this project.");
  }

  async assertProjectManager(
    projectId: string,
    workspaceId: string
  ): Promise<void> {
    const ok = await isProjectManager(
      projectId,
      workspaceId,
      this.userId,
      this.redis,
      this.db
    );
    if (!ok) throw AppError.forbidden("Project manager access required.");
  }

  async assertPageCollaborator(pageId: string): Promise<void> {
    const ok = await isPageCollaborator(
      pageId,
      this.userId,
      this.redis,
      this.db
    );
    if (!ok)
      throw AppError.forbidden("You are not a collaborator on this page.");
  }

  async assertBoardCollaborator(boardId: string): Promise<void> {
    const ok = await isBoardCollaborator(
      boardId,
      this.userId,
      this.redis,
      this.db
    );
    if (!ok)
      throw AppError.forbidden("You are not a collaborator on this board.");
  }

  async assertChannelMember(channelId: string): Promise<void> {
    const ok = await isChannelMember(
      channelId,
      this.userId,
      this.redis,
      this.db
    );
    if (!ok) throw AppError.forbidden("You are not a member of this channel.");
  }

  // ── Boolean methods (no throw) ────────────────────────────────────────────

  isWorkspaceMember(workspaceId: string): Promise<boolean> {
    return isWorkspaceMember(workspaceId, this.userId, this.redis, this.db);
  }

  isProjectMember(projectId: string): Promise<boolean> {
    return isProjectMember(projectId, this.userId, this.redis, this.db);
  }

  isPageCollaborator(pageId: string): Promise<boolean> {
    return isPageCollaborator(pageId, this.userId, this.redis, this.db);
  }

  isBoardCollaborator(boardId: string): Promise<boolean> {
    return isBoardCollaborator(boardId, this.userId, this.redis, this.db);
  }

  isChannelMember(channelId: string): Promise<boolean> {
    return isChannelMember(channelId, this.userId, this.redis, this.db);
  }

  // ── Getter methods ────────────────────────────────────────────────────────

  getWorkspaceMemberWithRole(
    workspaceId: string
  ): Promise<MemberWithRole | null> {
    return getWorkspaceMemberWithRole(
      workspaceId,
      this.userId,
      this.redis,
      this.db
    );
  }

  getWorkspace(workspaceId: string): Promise<CachedWorkspace | null> {
    return getWorkspace(workspaceId, this.redis, this.db);
  }

  getProject(projectId: string): Promise<CachedProject | null> {
    return getProject(projectId, this.redis, this.db);
  }

  getPage(pageId: string): Promise<CachedPage | null> {
    return getPage(pageId, this.redis, this.db);
  }

  getBoard(boardId: string): Promise<CachedBoard | null> {
    return getBoard(boardId, this.redis, this.db);
  }

  getChannel(channelId: string): Promise<CachedChannel | null> {
    return getChannel(channelId, this.redis, this.db);
  }

  getUser(userId: string): Promise<PublicUser | null> {
    return getUser(userId, this.redis, this.db);
  }

  getUsersByIds(userIds: string[]): Promise<PublicUser[]> {
    return getUsersByIds(userIds, this.redis, this.db);
  }

  resolveMentions(
    handles: string[],
    workspaceId: string
  ): Promise<MentionedUser[]> {
    return resolveMentions(handles, workspaceId, this.redis, this.db);
  }
}
