import { appRedis } from "@/infra/redis";

/**
 * Redis Operations for Read Receipts
 *
 * Uses centralized appRedis instance for consistency with codebase architecture.
 *
 * Data Structures:
 * - delivered:{conversationId} - Sorted Set (score=sequence, member=userId)
 * - read:{conversationId} - Sorted Set (score=sequence, member=userId)
 * - msg:{messageId}:readcount - String (integer count)
 */

/**
 * Update delivery watermark (implicit from new-message send)
 * Key: delivered:{conversationId}
 * Type: Sorted Set (score = sequence, member = userId)
 */
export async function updateDeliveryWatermark(
  conversationId: string,
  userId: string,
  sequence: number
): Promise<void> {
  const key = `delivered:${conversationId}`;
  await appRedis.zadd(key, sequence, userId);
  await appRedis.expire(key, 7 * 24 * 60 * 60); // 7 days TTL
}

/**
 * Update read watermark
 * Key: read:{conversationId}
 * Type: Sorted Set (score = lastReadSequence, member = userId)
 */
export async function updateReadWatermark(
  conversationId: string,
  userId: string,
  messageId: string,
  sequence: number
): Promise<void> {
  const key = `read:${conversationId}`;

  // Update sorted set with latest sequence
  await appRedis.zadd(key, sequence, userId);
  await appRedis.expire(key, 30 * 24 * 60 * 60); // 30 days TTL

  // Optional: Increment per-message read count
  const countKey = `msg:${messageId}:readcount`;
  await appRedis.incr(countKey);
  await appRedis.expire(countKey, 7 * 24 * 60 * 60);
}

/**
 * Get user's read watermark
 */
export async function getUserReadWatermark(
  conversationId: string,
  userId: string
): Promise<number> {
  const key = `read:${conversationId}`;
  const score = await appRedis.zscore(key, userId);
  return score ? parseInt(score) : 0;
}

/**
 * Get all users who read up to a specific sequence
 */
export async function getUsersWhoRead(
  conversationId: string,
  minSequence: number
): Promise<string[]> {
  const key = `read:${conversationId}`;
  return await appRedis.zrangebyscore(key, minSequence, "+inf");
}

/**
 * Get read count for a specific message
 */
export async function getMessageReadCount(messageId: string): Promise<number> {
  const count = await appRedis.get(`msg:${messageId}:readcount`);
  return count ? parseInt(count) : 0;
}

/**
 * Check if user is subscribed (online)
 */
export async function isUserSubscribed(
  conversationId: string,
  userId: string
): Promise<boolean> {
  return (
    (await appRedis.sismember(`subscriptions:${conversationId}`, userId)) === 1
  );
}

/**
 * Get all subscribed (online) users in conversation
 */
export async function getSubscribedUsers(
  conversationId: string
): Promise<string[]> {
  return await appRedis.smembers(`subscriptions:${conversationId}`);
}
