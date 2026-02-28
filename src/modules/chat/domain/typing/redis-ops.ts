import { appRedis } from "@/infra/redis";

/**
 * Typing Indicators - Redis Operations
 *
 * Ephemeral state management for real-time typing indicators.
 * Uses individual keys with TTL for automatic cleanup.
 *
 * Data Structure:
 * - typing:{conversationId}:{userId} = "1" (TTL: 5s)
 */

const TYPING_TTL = 5; // seconds

/**
 * Mark user as typing in conversation
 * Auto-expires after 5 seconds via SETEX
 */
export async function setTyping(
  conversationId: string,
  userId: string
): Promise<void> {
  const key = `typing:${conversationId}:${userId}`;
  await appRedis.setex(key, TYPING_TTL, "1");
}

/**
 * Clear typing state
 * Called when user stops typing or sends message
 */
export async function clearTyping(
  conversationId: string,
  userId: string
): Promise<void> {
  const key = `typing:${conversationId}:${userId}`;
  await appRedis.del(key);
}

/**
 * Get all users currently typing in conversation
 * Uses SCAN to find all typing:{conversationId}:* keys
 *
 * Note: Only needed for initial state on page load (rare operation)
 */
export async function getActiveTypers(
  conversationId: string
): Promise<string[]> {
  const pattern = `typing:${conversationId}:*`;
  const keys = await appRedis.keys(pattern);

  return keys.map((key) => {
    const parts = key.split(":");
    return parts[2]; // Extract userId from typing:{convId}:{userId}
  });
}
