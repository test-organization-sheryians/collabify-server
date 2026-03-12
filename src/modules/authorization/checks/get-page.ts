import type { Redis } from "ioredis";
import type { PrismaClient } from "@prisma/client";
import type { CachedPage } from "../types/auth-gate-types";
import { keys } from "../cache/keys";
import { getResourceState, setResourceState } from "../cache/resource-cache";

/**
 * getPage — fetches page metadata with caching.
 * Cached fields are those used for authorization decisions:
 * isArchived, isLocked, deletedAt.
 *
 * Cache key: auth:page:{pageId}:state → JSON CachedPage
 * TTL:       RESOURCE_STATE_TTL (30s — changes frequently via lock/archive)
 */
export async function getPage(
  pageId: string,
  redis: Redis,
  db: PrismaClient
): Promise<CachedPage | null> {
  const cacheKey = keys.pageState(pageId);

  const cached = await getResourceState<CachedPage>(cacheKey, redis);
  if (cached) return cached;

  const page = await db.page.findUnique({
    where: { id: pageId },
    select: {
      id: true,
      projectId: true,
      isArchived: true,
      isLocked: true,
      deletedAt: true,
    },
  });

  if (!page) return null;

  const cached_: CachedPage = {
    id: page.id,
    projectId: page.projectId,
    isArchived: page.isArchived,
    isLocked: page.isLocked,
    deletedAt: page.deletedAt?.toISOString() ?? null,
  };

  await setResourceState(cacheKey, cached_, redis);
  return cached_;
}
