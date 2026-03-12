import type { Redis } from "ioredis";
import type { PrismaClient } from "@prisma/client";
import type { CachedChannel } from "../types/auth-gate-types";
import { keys } from "../cache/keys";
import { MEMBERSHIP_TTL } from "../cache/ttl";

/**
 * getChannel — fetches chat conversation (channel) metadata with caching.
 * Note: Prisma model is 'ChatConversation' (not 'channel').
 *
 * Cache key: auth:channel:{channelId}:state → JSON CachedChannel
 * TTL:       MEMBERSHIP_TTL (5 min)
 */
export async function getChannel(
  channelId: string,
  redis: Redis,
  db: PrismaClient
): Promise<CachedChannel | null> {
  const cacheKey = keys.channelState(channelId);

  const raw = await redis.get(cacheKey);
  if (raw) return JSON.parse(raw) as CachedChannel;

  const channel = await db.chatConversation.findUnique({
    where: { id: channelId },
    select: { id: true, workspaceId: true, isArchived: true },
  });

  if (!channel) return null;

  const value: CachedChannel = {
    id: channel.id,
    workspaceId: channel.workspaceId,
    isArchived: channel.isArchived,
  };

  await redis.set(cacheKey, JSON.stringify(value), "EX", MEMBERSHIP_TTL, "NX");
  return value;
}
