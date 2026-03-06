import { Redis } from "ioredis";
import { addReactionScript, removeReactionScript } from "./scripts";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("chat:domain:reactions:helpers");

export interface AddReactionParams {
  messageId: string;
  userId: string;
  emoji: string;
  conversationId: string;
}

export interface RemoveReactionParams {
  messageId: string;
  userId: string;
  emoji: string;
  conversationId: string;
}

export interface ReactionEvent {
  eventId: string;
  action: "add" | "remove";
  messageId: string;
  userId: string;
  emoji: string;
  timestamp: number;
}

/**
 * Add reaction using Lua script (atomic)
 */
export const addReaction = async (
  redis: Redis,
  params: AddReactionParams
): Promise<{ added: boolean }> => {
  const { messageId, userId, emoji, conversationId } = params;
  const timestamp = Date.now();

  const result = (await redis.eval(
    addReactionScript,
    4, // Number of keys
    `reactions:${messageId}:${emoji}`,
    `reaction-counts:${messageId}`,
    `user-reactions:${userId}`,
    `reaction-events:${conversationId}`,
    timestamp,
    userId,
    emoji,
    messageId,
    conversationId
  )) as number;

  return { added: result === 1 };
};

/**
 * Remove reaction using Lua script (atomic)
 */
export const removeReaction = async (
  redis: Redis,
  params: RemoveReactionParams
): Promise<{ removed: boolean }> => {
  const { messageId, userId, emoji, conversationId } = params;
  const timestamp = Date.now();

  const result = (await redis.eval(
    removeReactionScript,
    4,
    `reactions:${messageId}:${emoji}`,
    `reaction-counts:${messageId}`,
    `user-reactions:${userId}`,
    `reaction-events:${conversationId}`,
    userId,
    emoji,
    messageId,
    conversationId,
    timestamp
  )) as number;

  return { removed: result === 1 };
};

/**
 * Get reaction counts for a message
 */
export const getReactionCounts = async (
  redis: Redis,
  messageId: string
): Promise<Record<string, number>> => {
  const counts = await redis.hgetall(`reaction-counts:${messageId}`);

  // Convert string values to numbers
  return Object.fromEntries(
    Object.entries(counts).map(([emoji, count]) => [emoji, parseInt(count, 10)])
  );
};

/**
 * Get users who reacted with specific emoji (paginated)
 */
export const getReactionUsers = async (
  redis: Redis,
  messageId: string,
  emoji: string,
  cursor: number = 0,
  limit: number = 20
): Promise<{ userIds: string[]; nextCursor: number | null }> => {
  const userIds = await redis.zrange(
    `reactions:${messageId}:${emoji}`,
    cursor,
    cursor + limit - 1,
    "REV" // Newest first
  );

  return {
    userIds,
    nextCursor: userIds.length === limit ? cursor + limit : null,
  };
};

/**
 * Check if user has reacted to message with emoji
 */
export const hasUserReacted = async (
  redis: Redis,
  messageId: string,
  userId: string,
  emoji: string
): Promise<boolean> => {
  const isMember = await redis.sismember(
    `user-reactions:${userId}`,
    `${messageId}:${emoji}`
  );
  return isMember === 1;
};

/**
 * Sync reaction events (delta sync on reconnect)
 */
export const syncReactionEvents = async (
  redis: Redis,
  conversationId: string,
  lastEventId: string = "0-0"
): Promise<ReactionEvent[]> => {
  const streamKey = `reaction-events:${conversationId}`;

  const events = await redis.xread("STREAMS", streamKey, lastEventId);

  if (!events || events.length === 0) {
    return [];
  }

  // Parse Redis stream response
  const streamData = events[0][1];

  return streamData.map((event: any[]) => {
    const eventId = event[0];
    const fields = event[1];

    // Fields are in [key, value, key, value] format
    const fieldMap: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
      fieldMap[fields[i]] = fields[i + 1];
    }

    return {
      eventId,
      action: fieldMap.action as "add" | "remove",
      messageId: fieldMap.messageId,
      userId: fieldMap.userId,
      emoji: fieldMap.emoji,
      timestamp: parseInt(fieldMap.ts, 10),
    };
  });
};

/**
 * Rebuild reaction cache from database (used on cache miss)
 */
export const rebuildReactionCache = async (
  redis: Redis,
  messageId: string,
  reactions: Array<{ userId: string; emoji: string; createdAt: Date }>
): Promise<void> => {
  if (reactions.length === 0) return;

  const pipeline = redis.pipeline();
  const emojiCounts = new Map<string, number>();

  for (const r of reactions) {
    // Add to per-emoji sorted set
    pipeline.zadd(
      `reactions:${messageId}:${r.emoji}`,
      r.createdAt.getTime(),
      r.userId
    );

    // Track counts
    emojiCounts.set(r.emoji, (emojiCounts.get(r.emoji) || 0) + 1);

    // Add to user's reaction index
    pipeline.sadd(`user-reactions:${r.userId}`, `${messageId}:${r.emoji}`);
  }

  // Set counts
  for (const [emoji, count] of emojiCounts) {
    pipeline.hset(`reaction-counts:${messageId}`, emoji, count);
  }

  // Set TTL (7 days)
  const ttl = 604800;
  for (const emoji of emojiCounts.keys()) {
    pipeline.expire(`reactions:${messageId}:${emoji}`, ttl);
  }
  pipeline.expire(`reaction-counts:${messageId}`, ttl);

  await pipeline.exec();

  logger.info("Rebuilt reaction cache", {
    messageId,
    count: reactions.length,
  });
};
