import type { Redis } from "ioredis";
import type { PrismaClient } from "@prisma/client";
import type { CachedWorkspace } from "../types/auth-gate-types";
import { keys } from "../cache/keys";
import { MEMBERSHIP_TTL } from "../cache/ttl";

/**
 * getWorkspace — fetches workspace metadata with caching.
 *
 * Cache key: auth:ws:{wid}:meta → JSON CachedWorkspace
 * TTL:       MEMBERSHIP_TTL (5 min)
 * Miss:      db.workspace.findUnique
 */
export async function getWorkspace(
  workspaceId: string,
  redis: Redis,
  db: PrismaClient
): Promise<CachedWorkspace | null> {
  const cacheKey = keys.workspaceMeta(workspaceId);

  const raw = await redis.get(cacheKey);
  if (raw) return JSON.parse(raw) as CachedWorkspace;

  const ws = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true, slug: true },
  });

  if (!ws) return null;

  const cached: CachedWorkspace = { id: ws.id, name: ws.name, slug: ws.slug };
  await redis.set(cacheKey, JSON.stringify(cached), "EX", MEMBERSHIP_TTL, "NX");
  return cached;
}
