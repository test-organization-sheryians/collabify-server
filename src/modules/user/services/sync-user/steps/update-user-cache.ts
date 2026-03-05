/** Write the synced user to the Redis cache (TTL: 5 minutes). */
import type { User } from "@prisma/client";
import type { Redis } from "ioredis";

export async function updateUserCache(user: User, redis: Redis): Promise<void> {
  await redis.set(`user:${user.id}`, JSON.stringify(user), "EX", 300);
}
