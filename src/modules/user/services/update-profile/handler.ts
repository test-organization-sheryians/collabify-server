/**
 * updateProfile — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. updateUserFields — update fullName/avatarUrl; throw NOT_FOUND if missing
 *   2. bustCache        — invalidate Redis so next getMe returns fresh data
 */
import type { UpdateProfileInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { updateUserFields } from "./steps/update-user-fields";

export const updateProfile = async (
  input: UpdateProfileInput,
  ctx: ServiceContext
) => {
  const { userId, fullName, avatarUrl, bio, timezone, language } = input;
  const { db, redis } = ctx;

  const updated = await updateUserFields(userId, { fullName, avatarUrl, bio, timezone, language }, db);

  // Bust the Redis cache so the next getMe call reads fresh data from DB.
  // Strategy: DEL is fire-and-forget; a cache miss is safe (falls back to DB).
  await redis.del(`user:${userId}`);

  return updated;
};
