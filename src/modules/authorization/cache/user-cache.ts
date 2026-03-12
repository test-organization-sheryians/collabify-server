import type { Redis } from "ioredis";
import type { PublicUser } from "../types/auth-gate-types";
import { keys } from "./keys";
import { USER_PROFILE_TTL } from "./ttl";

export async function getCachedUser(
  userId: string,
  redis: Redis
): Promise<PublicUser | null> {
  const raw = await redis.get(keys.userProfile(userId));
  if (!raw) return null;
  return JSON.parse(raw) as PublicUser;
}

export async function setCachedUser(
  user: PublicUser,
  redis: Redis
): Promise<void> {
  await redis.set(
    keys.userProfile(user.id),
    JSON.stringify(user),
    "EX",
    USER_PROFILE_TTL,
    "NX"
  );
}

/**
 * Batch fetch user profiles via Redis MGET pipeline.
 * Returns array aligned with input userIds — null for each cache miss.
 */
export async function getCachedUsersBatch(
  userIds: string[],
  redis: Redis
): Promise<(PublicUser | null)[]> {
  if (userIds.length === 0) return [];
  const cacheKeys = userIds.map(keys.userProfile);
  const results = await redis.mget(...cacheKeys);
  return results.map((raw) => (raw ? (JSON.parse(raw) as PublicUser) : null));
}

/**
 * Backfill cache for multiple users in a single pipeline.
 */
export async function setCachedUsersBatch(
  users: PublicUser[],
  redis: Redis
): Promise<void> {
  if (users.length === 0) return;
  const pipeline = redis.pipeline();
  for (const user of users) {
    pipeline.set(
      keys.userProfile(user.id),
      JSON.stringify(user),
      "EX",
      USER_PROFILE_TTL,
      "NX"
    );
  }
  await pipeline.exec();
}
