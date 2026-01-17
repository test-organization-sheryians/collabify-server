import { ServiceContext } from "@/graphql/types";
import { GetMeInput } from "./types";

export const getMe = async (input: GetMeInput, ctx: ServiceContext) => {
  const { userId } = input;
  const { db, redis } = ctx;
  const cacheKey = `user:${userId}`;

  // 1. Try Cache
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // 2. Database Fallback
  const user = await db.user.findUnique({
    where: { id: userId, deletedAt: null },
  });

  // 3. Cache Update
  if (user) {
    await redis.set(cacheKey, JSON.stringify(user), "EX", 300); // 5 minutes
  }

  return user;
};
