import type { Redis } from "ioredis";
import type { PrismaClient } from "@prisma/client";
import { keys } from "../cache/keys";
import { getMembership, setMembership } from "../cache/membership-cache";
import { MEMBERSHIP_TTL } from "../cache/ttl";

/**
 * isChannelMember — checks if userId is a member of a chat conversation (channel).
 *
 * Note: The schema uses ChatMember / ChatConversation (not channelMember).
 * The auth module treats 'channelId' as conversationId for the cache key.
 *
 * Cache key: auth:channel:{channelId}:member:{uid} → "1" | "0"
 * TTL:       MEMBERSHIP_TTL (5 min)
 * Miss:      db.chatMember.findFirst (conversationId = channelId)
 */
export async function isChannelMember(
  channelId: string,
  userId: string,
  redis: Redis,
  db: PrismaClient
): Promise<boolean> {
  const cacheKey = keys.channelMember(channelId, userId);

  const cached = await getMembership(cacheKey, redis);
  if (cached !== null) return cached;

  const member = await db.chatMember.findFirst({
    where: { conversationId: channelId, userId },
    select: { id: true },
  });

  await setMembership(cacheKey, !!member, MEMBERSHIP_TTL, redis);
  return !!member;
}
