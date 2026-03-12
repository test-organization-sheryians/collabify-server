import type { Redis } from "ioredis";
import type { PrismaClient } from "@prisma/client";
import { keys } from "../cache/keys";
import { getMembership, setMembership } from "../cache/membership-cache";
import { MEMBERSHIP_TTL } from "../cache/ttl";

/**
 * isProjectMember — checks if userId is a member of projectId.
 *
 * Cache key: auth:proj:{pid}:member:{uid} → "1" | "0"
 * TTL:       MEMBERSHIP_TTL (5 min)
 * Miss:      db.projectMember.findUnique
 */
export async function isProjectMember(
  projectId: string,
  userId: string,
  redis: Redis,
  db: PrismaClient
): Promise<boolean> {
  const cacheKey = keys.projectMember(projectId, userId);

  const cached = await getMembership(cacheKey, redis);
  if (cached !== null) return cached;

  const member = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { id: true },
  });

  await setMembership(cacheKey, !!member, MEMBERSHIP_TTL, redis);
  return !!member;
}
