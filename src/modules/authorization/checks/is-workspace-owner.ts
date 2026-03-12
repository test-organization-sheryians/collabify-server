import type { Redis } from "ioredis";
import type { PrismaClient } from "@prisma/client";
import { getWorkspaceMemberCached } from "./is-workspace-admin";

const WORKSPACE_OWNER_RANK = 100;

/**
 * isWorkspaceOwner — checks if userId is the OWNER of workspaceId.
 *
 * Reuses the cached MemberWithRole from is-workspace-admin.ts.
 * Cache key: auth:ws:{wid}:member:{uid}
 */
export async function isWorkspaceOwner(
  workspaceId: string,
  userId: string,
  redis: Redis,
  db: PrismaClient
): Promise<boolean> {
  const member = await getWorkspaceMemberCached(workspaceId, userId, redis, db);
  if (!member) return false;
  return member.roleRank >= WORKSPACE_OWNER_RANK;
}
