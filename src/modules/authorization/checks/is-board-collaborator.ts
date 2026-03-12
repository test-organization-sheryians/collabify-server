import type { Redis } from "ioredis";
import type { PrismaClient } from "@prisma/client";
import { keys } from "../cache/keys";
import { getMembership, setMembership } from "../cache/membership-cache";
import { MEMBERSHIP_TTL } from "../cache/ttl";

/**
 * isBoardCollaborator — checks if userId is a collaborator on boardId (Whiteboard).
 *
 * Cache key: auth:board:{boardId}:collab:{uid} → "1" | "0"
 * TTL:       MEMBERSHIP_TTL (5 min)
 * Miss:      db.boardCollaborator.findFirst
 */
export async function isBoardCollaborator(
  boardId: string,
  userId: string,
  redis: Redis,
  db: PrismaClient
): Promise<boolean> {
  const cacheKey = keys.boardCollab(boardId, userId);

  const cached = await getMembership(cacheKey, redis);
  if (cached !== null) return cached;

  const collab = await db.whiteboardCollaborator.findFirst({
    where: { whiteboardId: boardId, userId },
    select: { id: true },
  });

  await setMembership(cacheKey, !!collab, MEMBERSHIP_TTL, redis);
  return !!collab;
}
