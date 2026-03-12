import type { Redis } from "ioredis";
import type { PrismaClient } from "@prisma/client";
import { isWorkspaceMember } from "../checks/is-workspace-member";
import { isProjectMember } from "../checks/is-project-member";
import { isPageCollaborator } from "../checks/is-page-collaborator";
import { isBoardCollaborator } from "../checks/is-board-collaborator";
import { isChannelMember } from "../checks/is-channel-member";
import { getProject } from "../checks/get-project";

/**
 * Session warmer — prefetches commonly needed auth checks in parallel.
 *
 * Called on workspace load (GraphQL) and WebSocket connect to prime Redis
 * so that the first handler request hits the cache rather than the DB.
 */

/**
 * Warms workspace membership + all project memberships for the user.
 * Used on initial workspace page load.
 */
export async function warmWorkspaceSession(
  workspaceId: string,
  userId: string,
  redis: Redis,
  db: PrismaClient
): Promise<void> {
  // Fetch all projects in workspace the user belongs to
  const memberships = await db.projectMember.findMany({
    where: { userId, project: { workspaceId } },
    select: { projectId: true },
  });

  // Run all membership checks in parallel to prime the cache
  await Promise.all([
    isWorkspaceMember(workspaceId, userId, redis, db),
    ...memberships.map(({ projectId }) =>
      isProjectMember(projectId, userId, redis, db)
    ),
    ...memberships.map(({ projectId }) => getProject(projectId, redis, db)),
  ]);
}

/**
 * Warms auth checks for an active WebSocket connection.
 * Used when a socket connects to prime page/board collab state.
 */
export async function warmWSSession(
  opts: {
    userId: string;
    workspaceId?: string;
    pageId?: string;
    boardId?: string;
    channelId?: string;
  },
  redis: Redis,
  db: PrismaClient
): Promise<void> {
  const tasks: Promise<unknown>[] = [];

  if (opts.workspaceId) {
    tasks.push(isWorkspaceMember(opts.workspaceId, opts.userId, redis, db));
  }
  if (opts.pageId) {
    tasks.push(isPageCollaborator(opts.pageId, opts.userId, redis, db));
  }
  if (opts.boardId) {
    tasks.push(isBoardCollaborator(opts.boardId, opts.userId, redis, db));
  }
  if (opts.channelId) {
    tasks.push(isChannelMember(opts.channelId, opts.userId, redis, db));
  }

  await Promise.all(tasks);
}
