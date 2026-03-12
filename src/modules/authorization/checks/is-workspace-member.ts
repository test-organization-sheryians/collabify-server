import type { Redis } from "ioredis";
import type { PrismaClient } from "@prisma/client";
import { keys } from "../cache/keys";
import { getMembership, setMembership } from "../cache/membership-cache";
import { MEMBERSHIP_TTL } from "../cache/ttl";

/**
 * isWorkspaceMember — checks if userId is a member of workspaceId.
 *
 * Cache key: auth:ws:{wid}:member:{uid}  → "1" | "0"
 * TTL:       MEMBERSHIP_TTL (5 min)
 * Miss:      db.workspaceMember.findUnique
 */
export async function isWorkspaceMember(
  workspaceId: string,
  userId: string,
  redis: Redis,
  db: PrismaClient
): Promise<boolean> {
  const cacheKey = keys.workspaceMember(workspaceId, userId);

  const cached = await getMembership(cacheKey, redis);
  if (cached !== null) return cached;

  const member = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { id: true },
  });

  await setMembership(cacheKey, !!member, MEMBERSHIP_TTL, redis);
  return !!member;
}
