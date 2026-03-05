/** Write the user to the Redis cache (TTL: 5 minutes). No-op if user is null. */
import type { User } from "@prisma/client";
import type { Redis } from "ioredis";

export async function cacheUser(
  cacheKey: string,
  user: User | null,
  redis: Redis
): Promise<void> {
  if (user) {
    await redis.set(cacheKey, JSON.stringify(user), "EX", 300);
  }
}
