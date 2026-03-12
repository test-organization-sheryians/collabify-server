import type { Redis } from "ioredis";
import type { PrismaClient } from "@prisma/client";
import { keys } from "../cache/keys";
import { getMembership, setMembership } from "../cache/membership-cache";
import { MEMBERSHIP_TTL } from "../cache/ttl";

/**
 * isPageCollaborator — checks if userId is a collaborator on pageId.
 *
 * Cache key: auth:page:{pageId}:collab:{uid} → "1" | "0"
 * TTL:       MEMBERSHIP_TTL (5 min)
 * Miss:      db.pageCollaborator.findFirst
 */
export async function isPageCollaborator(
  pageId: string,
  userId: string,
  redis: Redis,
  db: PrismaClient
): Promise<boolean> {
  const cacheKey = keys.pageCollab(pageId, userId);

  const cached = await getMembership(cacheKey, redis);
  if (cached !== null) return cached;

  const collab = await db.pageCollaborator.findFirst({
    where: { pageId, userId },
    select: { id: true },
  });

  await setMembership(cacheKey, !!collab, MEMBERSHIP_TTL, redis);
  return !!collab;
}
