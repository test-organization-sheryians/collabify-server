import type { Redis } from "ioredis";
import type { PrismaClient } from "@prisma/client";
import type { CachedBoard } from "../types/auth-gate-types";
import { keys } from "../cache/keys";
import { getResourceState, setResourceState } from "../cache/resource-cache";

/**
 * getBoard — fetches whiteboard metadata with caching.
 * Note: Prisma model is 'Whiteboard' (not 'board').
 *
 * Cache key: auth:board:{boardId}:state → JSON CachedBoard
 * TTL:       RESOURCE_STATE_TTL (30s)
 */
export async function getBoard(
  boardId: string,
  redis: Redis,
  db: PrismaClient
): Promise<CachedBoard | null> {
  const cacheKey = keys.boardState(boardId);

  const cached = await getResourceState<CachedBoard>(cacheKey, redis);
  if (cached) return cached;

  const board = await db.whiteboard.findUnique({
    where: { id: boardId },
    select: { id: true, projectId: true },
  });

  if (!board) return null;

  const value: CachedBoard = {
    id: board.id,
    projectId: board.projectId ?? "",
    isArchived: false, // Whiteboard has no isArchived — default to false
    isLocked: false, // Whiteboard has no isLocked — default to false
  };

  await setResourceState(cacheKey, value, redis);
  return value;
}
