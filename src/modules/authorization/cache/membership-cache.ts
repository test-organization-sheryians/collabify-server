import type { Redis } from "ioredis";

/**
 * Low-level boolean membership R/W helper.
 * Used by all checks/* files for membership and collaborator keys.
 *
 * Values: "1" = member/collab exists, "0" = does not exist (negative cache)
 */

export async function getMembership(
  cacheKey: string,
  redis: Redis
): Promise<boolean | null> {
  const val = await redis.get(cacheKey);
  if (val === null) return null; // cache miss
  return val === "1";
}

export async function setMembership(
  cacheKey: string,
  value: boolean,
  ttl: number,
  redis: Redis
): Promise<void> {
  // SET NX EX: first writer wins — safe under concurrent misses
  await redis.set(cacheKey, value ? "1" : "0", "EX", ttl, "NX");
}
