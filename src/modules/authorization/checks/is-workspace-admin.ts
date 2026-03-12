import type { Redis } from "ioredis";
import type { PrismaClient } from "@prisma/client";
import type { MemberWithRole } from "../types/auth-gate-types";
import { keys } from "../cache/keys";
import { MEMBERSHIP_TTL } from "../cache/ttl";

const WORKSPACE_ADMIN_RANK = 80;

/**
 * isWorkspaceAdminOrAbove — checks if userId has ADMIN or OWNER role in the workspace.
 * Reads the member+role from cache if available, fetches from DB on miss.
 *
 * Cache key: auth:ws:{wid}:member:{uid} → JSON MemberWithRole
 * TTL:       MEMBERSHIP_TTL (5 min)
 */
export async function isWorkspaceAdminOrAbove(
  workspaceId: string,
  userId: string,
  redis: Redis,
  db: PrismaClient
): Promise<boolean> {
  const member = await getWorkspaceMemberCached(workspaceId, userId, redis, db);
  if (!member) return false;
  return member.roleRank >= WORKSPACE_ADMIN_RANK;
}

/** Internal: fetch full member+role, used by this file and get-workspace-member.ts */
export async function getWorkspaceMemberCached(
  workspaceId: string,
  userId: string,
  redis: Redis,
  db: PrismaClient
): Promise<MemberWithRole | null> {
  const cacheKey = keys.workspaceMember(workspaceId, userId);

  const raw = await redis.get(cacheKey);
  if (raw) {
    const parsed = JSON.parse(raw);
    // Distinguish between boolean "0" cache and full JSON
    if (typeof parsed === "object" && parsed !== null && "roleRank" in parsed) {
      return parsed as MemberWithRole;
    }
  }

  const row = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: {
      id: true,
      userId: true,
      assignedRole: {
        select: { name: true, rank: true, id: true },
      },
    },
  });

  if (!row) {
    // Cache negative result
    await redis.set(cacheKey, "0", "EX", MEMBERSHIP_TTL, "NX");
    return null;
  }

  const member: MemberWithRole = {
    id: row.id,
    userId: row.userId,
    role: row.assignedRole.name,
    roleRank: row.assignedRole.rank,
  };

  await redis.set(cacheKey, JSON.stringify(member), "EX", MEMBERSHIP_TTL, "NX");
  return member;
}
