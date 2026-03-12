import type { Redis } from "ioredis";
import type { PrismaClient } from "@prisma/client";
import type { CachedProject } from "../types/auth-gate-types";
import { keys } from "../cache/keys";
import { MEMBERSHIP_TTL } from "../cache/ttl";

/**
 * getProject — fetches project metadata with caching.
 * Note: Project has no 'slug' field — uses 'key' as identifier.
 *
 * Cache key: auth:proj:{pid}:meta → JSON CachedProject
 * TTL:       MEMBERSHIP_TTL (5 min)
 */
export async function getProject(
  projectId: string,
  redis: Redis,
  db: PrismaClient
): Promise<CachedProject | null> {
  const cacheKey = keys.projectMeta(projectId);

  const raw = await redis.get(cacheKey);
  if (raw) return JSON.parse(raw) as CachedProject;

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      workspaceId: true,
      name: true,
      key: true,
      isArchived: true,
    },
  });

  if (!project) return null;

  const cached: CachedProject = {
    id: project.id,
    workspaceId: project.workspaceId,
    name: project.name,
    slug: project.key, // key is the short identifier used as slug
    isArchived: project.isArchived,
  };

  await redis.set(cacheKey, JSON.stringify(cached), "EX", MEMBERSHIP_TTL, "NX");
  return cached;
}
