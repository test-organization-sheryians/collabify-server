import type { Redis } from "ioredis";
import type { PrismaClient } from "@prisma/client";
import type { PublicUser } from "../types/auth-gate-types";
import { getCachedUsersBatch, setCachedUsersBatch } from "../cache/user-cache";

/**
 * getUsersByIds — batch-fetch public profiles via Redis MGET pipeline.
 *
 * 1. MGET all user keys in one round-trip
 * 2. Identify cache misses
 * 3. DB findMany for misses only
 * 4. Backfill misses into cache
 * 5. Return aligned array (preserves input order)
 */
export async function getUsersByIds(
  userIds: string[],
  redis: Redis,
  db: PrismaClient
): Promise<PublicUser[]> {
  if (userIds.length === 0) return [];

  const deduped = [...new Set(userIds)];

  // 1. Batch Redis MGET
  const cached = await getCachedUsersBatch(deduped, redis);

  // 2. Identify misses
  const missIds: string[] = [];
  cached.forEach((val, i) => {
    if (!val) missIds.push(deduped[i]);
  });

  // 3. Fetch misses from DB
  const missMap = new Map<string, PublicUser>();
  if (missIds.length > 0) {
    const rows = await db.user.findMany({
      where: { id: { in: missIds } },
      select: {
        id: true,
        fullName: true,
        avatarUrl: true,
        email: true,
      },
    });

    for (const row of rows) {
      missMap.set(row.id, {
        id: row.id,
        fullName: row.fullName ?? "",
        avatarUrl: row.avatarUrl,
        username: row.email,
      });
    }

    // 4. Backfill cache
    await setCachedUsersBatch([...missMap.values()], redis);
  }

  // 5. Merge and return (same order as input)
  return userIds
    .map((id) => {
      const idx = deduped.indexOf(id);
      return cached[idx] ?? missMap.get(id) ?? null;
    })
    .filter((u): u is PublicUser => u !== null);
}
