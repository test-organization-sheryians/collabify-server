/**
 * getMe — Query Handler (thin orchestrator)
 *
 * Steps:
 *   1. fetchFromCache   — Redis GET; return immediately on hit
 *   2. fetchUserFromDb  — DB lookup (deletedAt: null guard)
 *   3. cacheUser        — Redis SET on DB hit (TTL: 5 min); no-op for null
 */
import type { GetMeInput } from "./types";
import type { ServiceContext } from "@/graphql/types";
import { fetchFromCache } from "./steps/fetch-from-cache";
import { fetchUserFromDb } from "./steps/fetch-user-from-db";
import { cacheUser } from "./steps/cache-user";

export const getMe = async (input: GetMeInput, ctx: ServiceContext) => {
  const { userId } = input;
  const { db, redis } = ctx;
  const cacheKey = `user:${userId}`;

  const cached = await fetchFromCache(cacheKey, redis);
  if (cached) return cached;

  const user = await fetchUserFromDb(userId, db);
  await cacheUser(cacheKey, user, redis);

  return user;
};
