import { Redis } from "ioredis";

/**
 * Whiteboard Lua Scripts for Atomic Redis Operations
 *
 * PERFORMANCE BENEFIT:
 * - 5 round trips → 1 round trip (presence tracking)
 * - 2 round trips → 1 round trip (board activation)
 * - Eliminates race conditions
 * - Atomic execution guaranteed
 */

/**
 * Presence Tracking Script
 *
 * Atomically handles:
 * 1. ZADD NX (detect first join)
 * 2. ZADD (update timestamp if exists)
 * 3. EXPIRE (sliding TTL)
 * 4. ZCARD (get subscriber count)
 *
 * KEYS[1] = board:subscribers:{boardId}
 * ARGV[1] = timestamp
 * ARGV[2] = userId
 * ARGV[3] = TTL (86400)
 *
 * Returns: [isFirstJoin (0|1), subscriberCount]
 */
const PRESENCE_TRACKING_SCRIPT = `
local key = KEYS[1]
local timestamp = tonumber(ARGV[1])
local userId = ARGV[2]
local ttl = tonumber(ARGV[3])

-- Try to add with NX (returns 1 if added, 0 if exists)
local isFirstJoin = redis.call('ZADD', key, 'NX', timestamp, userId)

-- If user already exists, update timestamp (remove NX flag)
if isFirstJoin == 0 then
  redis.call('ZADD', key, timestamp, userId)
end

-- Set sliding TTL
redis.call('EXPIRE', key, ttl)

-- Get total subscriber count
local subscriberCount = redis.call('ZCARD', key)

return {isFirstJoin, subscriberCount}
`;

/**
 * Board Activation Script
 *
 * Atomically handles:
 * 1. ZADD (register board as active)
 * 2. INCR (bump epoch for worker rebalancing)
 *
 * KEYS[1] = sys:boards:active
 * KEYS[2] = sys:boards:epoch
 * ARGV[1] = timestamp
 * ARGV[2] = boardId
 *
 * Returns: new epoch value
 */
const BOARD_ACTIVATION_SCRIPT = `
local activeKey = KEYS[1]
local epochKey = KEYS[2]
local timestamp = tonumber(ARGV[1])
local boardId = ARGV[2]

-- Register board as active
redis.call('ZADD', activeKey, timestamp, boardId)

-- Increment epoch to trigger coordinator rebalance
local newEpoch = redis.call('INCR', epochKey)

return newEpoch
`;

/**
 * Atomic Board Update Script (V4 Production-Hardened, Simplified)
 *
 * Atomically handles:
 * 1. Dedupe check (CRITICAL: prevents data loss on gateway crash)
 * 2. Backpressure guard (stream length limit)
 * 3. Stream append
 * 4. Dedupe marker set
 *
 * Ordering: Redis Stream ID is the source of truth (no separate sequence counter needed)
 *
 * KEYS[1] = board:{boardId}:stream
 * KEYS[2] = board:{boardId}:dedupe:{dedupeId}
 * ARGV[1] = boardId
 * ARGV[2] = update (Base64)
 * ARGV[3] = userId
 * ARGV[4] = dedupeId
 * ARGV[5] = timestamp
 * ARGV[6] = dedupeTTL (60 seconds)
 *
 * Returns structured response:
 * { ok: true, streamId }
 * { ok: false, code: "DUPLICATE" }
 * { ok: false, code: "BACKPRESSURE_LIMIT" }
 */
const ATOMIC_BOARD_UPDATE_SCRIPT = `
local streamKey = KEYS[1]
local dedupeKey = KEYS[2]
local boardId = ARGV[1]
local update = ARGV[2]
local userId = ARGV[3]
local dedupeId = ARGV[4]
local timestamp = ARGV[5]
local dedupeTTL = tonumber(ARGV[6])

-- CRITICAL: Dedupe check INSIDE atomic block
-- Prevents data loss if gateway crashes after setting dedupe key
if redis.call("EXISTS", dedupeKey) == 1 then
  return cjson.encode({
    ok = false,
    code = "DUPLICATE"
  })
end

-- Backpressure: check stream length
local streamLen = redis.call("XLEN", streamKey)
local MAX_STREAM_LENGTH = 50000  -- ~50k updates before snapshot required

if streamLen >= MAX_STREAM_LENGTH then
  return cjson.encode({
    ok = false,
    code = "BACKPRESSURE_LIMIT",
    streamLen = streamLen,
    maxLen = MAX_STREAM_LENGTH
  })
end

-- Atomic: XADD + SETEX (no sequence counter needed - Stream ID is ordering)
local streamId = redis.call("XADD", streamKey, "*",
  "boardId", boardId,
  "update", update,
  "userId", userId,
  "dedupeId", dedupeId,
  "timestamp", timestamp
)

-- Set dedupe marker AFTER successful append
redis.call("SETEX", dedupeKey, dedupeTTL, "1")

return cjson.encode({
  ok = true,
  streamId = streamId
})
`;

/**
 * Load Lua scripts into Redis and return SHA hashes
 * Scripts are loaded once at startup for performance
 */
export const loadWhiteboardLuaScripts = async (redis: Redis) => {
  const [presenceTrackingSha, boardActivationSha, atomicBoardUpdateSha] =
    await Promise.all([
      redis.script("LOAD", PRESENCE_TRACKING_SCRIPT),
      redis.script("LOAD", BOARD_ACTIVATION_SCRIPT),
      redis.script("LOAD", ATOMIC_BOARD_UPDATE_SCRIPT),
    ]);

  return {
    presenceTrackingSha,
    boardActivationSha,
    atomicBoardUpdateSha,
  };
};

/**
 * Execute presence tracking script
 *
 * @returns [isFirstJoin (0|1), subscriberCount]
 */
export const executePresenceTracking = async (
  redis: Redis,
  scriptSha: string,
  subscribersKey: string,
  timestamp: number,
  userId: string,
  ttl: number = 86400
): Promise<[number, number]> => {
  const result = await redis.evalsha(
    scriptSha,
    1, // number of keys
    subscribersKey,
    timestamp.toString(),
    userId,
    ttl.toString()
  );

  return result as [number, number];
};

/**
 * Execute board activation script
 *
 * @returns new epoch value
 */
export const executeBoardActivation = async (
  redis: Redis,
  scriptSha: string,
  activeKey: string,
  epochKey: string,
  timestamp: number,
  boardId: string
): Promise<number> => {
  const result = await redis.evalsha(
    scriptSha,
    2, // number of keys
    activeKey,
    epochKey,
    timestamp.toString(),
    boardId
  );

  return result as number;
};

/**
 * Execute atomic board update script
 *
 * Uses EVAL (inline) instead of EVALSHA for simplicity.
 * Script is small and Redis caches it automatically.
 *
 * @returns Structured response:
 * - { ok: true, streamId }
 * - { ok: false, code: "DUPLICATE" | "BACKPRESSURE_LIMIT" }
 */
export const executeAtomicBoardUpdate = async (
  redis: Redis,
  streamKey: string,
  dedupeKey: string,
  boardId: string,
  update: string,
  userId: string,
  dedupeId: string,
  timestamp: number,
  dedupeTTL: number = 60
): Promise<{
  ok: boolean;
  streamId?: string;
  code?: string;
  streamLen?: number;
  maxLen?: number;
}> => {
  const result = await redis.eval(
    ATOMIC_BOARD_UPDATE_SCRIPT,
    2, // number of keys (stream, dedupe)
    streamKey,
    dedupeKey,
    boardId,
    update,
    userId,
    dedupeId,
    timestamp.toString(),
    dedupeTTL.toString()
  );

  return JSON.parse(result as string);
};
