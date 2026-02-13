import { appRedis } from "@/infra/redis";
import {
  WhiteboardKeys,
  WhiteboardTTLs,
} from "@/modules/whiteboard/infra/whiteboard-keys";
import { logger } from "@/shared/logger";
import { createHash } from "crypto";
import { randomUUID } from "crypto";

/** Rate limiting configuration */
const RATE_LIMIT_CONFIG = {
  maxUpdatesPerSecond: 100,
  burstAllowance: 200,
  windowMs: 1000,
} as const;

/** Loop detection configuration */
const LOOP_DETECTION_CONFIG = {
  windowMs: 2000,
  minPingPongs: 20,
} as const;

interface UpdateTrace {
  userId: string;
  timestamp: number;
}

/**
 * Layer 1: Rate Limiting (per user, per board)
 *
 * Uses Redis sorted set for sliding window rate limiting
 * Prevents single client from spam flooding
 */
export async function checkRateLimit(
  boardId: string,
  userId: string
): Promise<boolean> {
  const key = WhiteboardKeys.RateLimit(boardId, userId);
  const now = Date.now();

  // Remove expired entries (sliding window)
  await appRedis.zremrangebyscore(key, 0, now - RATE_LIMIT_CONFIG.windowMs);

  const count = await appRedis.zcard(key);

  if (count > RATE_LIMIT_CONFIG.maxUpdatesPerSecond) {
    logger.warn({
      msg: "🚫 Rate limit exceeded",
      userId,
      boardId,
      count,
      limit: RATE_LIMIT_CONFIG.maxUpdatesPerSecond,
    });
    return false;
  }

  // Add current request
  await appRedis.zadd(key, now, `${now}:${randomUUID()}`);
  await appRedis.expire(key, WhiteboardTTLs.RATE_LIMIT_WINDOW);

  return true;
}

/**
 * Layer 2: Duplicate Update Detection
 *
 * Hash-based duplicate detection within short window
 * Prevents identical updates being sent repeatedly
 */
export async function isDuplicateUpdate(
  boardId: string,
  userId: string,
  update: Uint8Array
): Promise<boolean> {
  const hash = createHash("sha256").update(update).digest("hex");
  const key = WhiteboardKeys.DuplicateUpdate(boardId, userId, hash);

  const exists = await appRedis.exists(key);

  if (exists) {
    logger.warn({
      msg: "🔁 Duplicate update detected",
      userId,
      boardId,
      hash: hash.slice(0, 8),
    });
    return true;
  }

  // Store hash with short TTL
  await appRedis.setex(key, WhiteboardTTLs.DUPLICATE_UPDATE, "1");

  return false;
}

/**
 * Layer 3: Ping-Pong Loop Detection
 *
 * Detects rapid alternating updates between 2 clients
 * Activates circuit breaker when loop detected
 */
export async function detectUpdateLoop(
  boardId: string,
  userId: string
): Promise<boolean> {
  const key = WhiteboardKeys.UpdateTrace(boardId);
  const now = Date.now();

  // Get recent trace
  const traces = await appRedis.lrange(key, 0, 50);
  const parsed: UpdateTrace[] = traces.map((t) => JSON.parse(t));

  // Filter to detection window
  const recent = parsed.filter(
    (t) => now - t.timestamp < LOOP_DETECTION_CONFIG.windowMs
  );

  // Analyze for ping-pong pattern
  const userIds = recent.map((t) => t.userId);
  const uniqueUsers = new Set(userIds);

  // Ping-pong = exactly 2 users alternating rapidly
  if (
    uniqueUsers.size === 2 &&
    recent.length > LOOP_DETECTION_CONFIG.minPingPongs
  ) {
    logger.error({
      msg: "🚨 Update loop detected - activating circuit breaker",
      boardId,
      users: Array.from(uniqueUsers),
      updateCount: recent.length,
    });

    // Activate circuit breaker
    await appRedis.setex(
      WhiteboardKeys.LoopCircuitBreaker(boardId),
      WhiteboardTTLs.LOOP_CIRCUIT_BREAKER,
      "1"
    );

    return true;
  }

  // Add current update to trace
  await appRedis.lpush(key, JSON.stringify({ userId, timestamp: now }));
  await appRedis.ltrim(key, 0, 100); // Keep last 100
  await appRedis.expire(key, WhiteboardTTLs.UPDATE_TRACE);

  return false;
}

/**
 * Layer 4: Circuit Breaker Check
 *
 * Returns true if circuit breaker is currently active
 */
export async function isCircuitBreakerActive(
  boardId: string
): Promise<boolean> {
  return (
    (await appRedis.exists(WhiteboardKeys.LoopCircuitBreaker(boardId))) === 1
  );
}

/**
 * Circuit Breaker Throttling
 *
 * When active, only allows 1 update per 100ms per user
 * Prevents runaway loops while allowing gradual recovery
 */
export async function enforceCircuitBreakerThrottle(
  boardId: string,
  userId: string
): Promise<void> {
  const throttleKey = WhiteboardKeys.RateLimit(boardId, userId);

  const canSend = await appRedis.set(throttleKey, "1", "PX", 100, "NX");

  if (!canSend) {
    throw new Error("CIRCUIT_BREAKER_THROTTLED");
  }
}
