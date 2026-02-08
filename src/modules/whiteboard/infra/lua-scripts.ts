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
 * Load Lua scripts into Redis and return SHA hashes
 * Scripts are loaded once at startup for performance
 */
export const loadWhiteboardLuaScripts = async (redis: Redis) => {
  const [presenceTrackingSha, boardActivationSha] = await Promise.all([
    redis.script("LOAD", PRESENCE_TRACKING_SCRIPT),
    redis.script("LOAD", BOARD_ACTIVATION_SCRIPT),
  ]);

  return {
    presenceTrackingSha,
    boardActivationSha,
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
