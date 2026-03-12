import type { Redis } from "ioredis";
import { keys } from "../cache/keys";

export async function invalidateUserProfile(
  userId: string,
  redis: Redis
): Promise<void> {
  await redis.del(keys.userProfile(userId));
}
