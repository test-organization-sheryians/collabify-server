import type { Redis } from "ioredis";
import type { PrismaClient } from "@prisma/client";
import type { PublicUser } from "../types/auth-gate-types";
import { getCachedUser, setCachedUser } from "../cache/user-cache";

/**
 * getUser — fetches a single user's public profile with caching.
 *
 * Note: User model has no `username` field — using email as identifier.
 *
 * Cache key: auth:user:{uid}:profile → JSON PublicUser
 * TTL:       USER_PROFILE_TTL (30 min)
 * Miss:      db.user.findUnique
 */
export async function getUser(
  userId: string,
  redis: Redis,
  db: PrismaClient
): Promise<PublicUser | null> {
  const cached = await getCachedUser(userId, redis);
  if (cached) return cached;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
      email: true,
    },
  });

  if (!user) return null;

  const profile: PublicUser = {
    id: user.id,
    fullName: user.fullName ?? "",
    avatarUrl: user.avatarUrl,
    username: user.email, // email used as the mention handle
  };

  await setCachedUser(profile, redis);
  return profile;
}
