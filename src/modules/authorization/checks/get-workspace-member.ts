import type { Redis } from "ioredis";
import type { PrismaClient } from "@prisma/client";
import type { MemberWithRole } from "../types/auth-gate-types";
import { getWorkspaceMemberCached } from "./is-workspace-admin";

/**
 * getWorkspaceMemberWithRole — returns the full member + role data for
 * workspace RBAC decisions (e.g. rank comparison for role assignment guards).
 *
 * Delegates to the shared cache in is-workspace-admin.ts.
 */
export async function getWorkspaceMemberWithRole(
  workspaceId: string,
  userId: string,
  redis: Redis,
  db: PrismaClient
): Promise<MemberWithRole | null> {
  return getWorkspaceMemberCached(workspaceId, userId, redis, db);
}
