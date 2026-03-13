import type { ServiceContext } from "@/graphql/types";
import type { User } from "@prisma/client";
import { getReactionUsers as getReactionUsersFromRedis } from "@/modules/chat/domain/reactions/redis-helpers";
import type { GetReactionUsersInput } from "../schema";

/**
 * fetchReactionUsers — fetches paginated reaction users from Redis (hot path).
 * Falls back to empty (Redis is source of truth for reactions).
 * Uses dataloaders to batch-resolve user profiles.
 */
export async function fetchReactionUsers(
  input: GetReactionUsersInput,
  ctx: ServiceContext
): Promise<{ users: User[]; nextCursor: number | null }> {
  const { messageId, emoji, cursor = 0 } = input;

  const { userIds, nextCursor } = await getReactionUsersFromRedis(
    ctx.redis,
    messageId,
    emoji,
    cursor,
    20
  );

  const rawUsers = await Promise.all(
    userIds.map((id) => ctx.dataloaders.chat.userById.load(id))
  );

  const users: User[] = rawUsers.filter(
    (u: User | null): u is User => u !== null
  );

  return { users, nextCursor };
}
