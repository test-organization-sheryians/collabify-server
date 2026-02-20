/**
 * Lua: Presence Tracking
 *
 * Two atomic scripts for subscriber lifecycle.
 * Without atomicity, two concurrent sockets for the same user could BOTH see
 * isNew=1 and trigger duplicate "user-joined" broadcasts, or both see count=1
 * and double-bump the epoch. Lua scripts execute atomically on the Redis server.
 */

// ─── Script 1: Presence Tracking ─────────────────────────────────────────────

/**
 * Atomically record a subscriber joining a page.
 *
 * KEYS[1] = page:{pageId}:subscribers  (ZSET)
 * ARGV[1] = userId
 * ARGV[2] = current timestamp (epoch ms as string)
 * ARGV[3] = TTL in seconds (PageTTLs.SUBSCRIBERS)
 *
 * RETURNS: [isNew: 0|1, subscriberCount: integer]
 *   isNew = 1 → first socket for this user on this page
 *   isNew = 0 → user was already in the ZSET (reconnect / second tab)
 */
export const PRESENCE_TRACKING_SCRIPT = `
local membersKey = KEYS[1]
local userId     = ARGV[1]
local timestamp  = ARGV[2]
local ttl        = tonumber(ARGV[3])

local isNew = redis.call('ZADD', membersKey, 'NX', timestamp, userId)
redis.call('ZADD', membersKey, timestamp, userId)
redis.call('EXPIRE', membersKey, ttl)
local count = redis.call('ZCARD', membersKey)

return {isNew, count}
`;

// ─── Script 2: Page Activation ────────────────────────────────────────────────

/**
 * Marks a page as active in the system-wide ZSET and bumps the epoch counter.
 * Call ONLY when PRESENCE_TRACKING returns isNew=1 AND count=1.
 *
 * KEYS[1] = sys:pages:active  (ZSET)
 * KEYS[2] = sys:pages:epoch   (string counter)
 * ARGV[1] = pageId
 * ARGV[2] = current timestamp (epoch ms as string, used as ZSET score)
 *
 * RETURNS: new epoch value (integer)
 *
 * Bumping the epoch signals all stream worker instances to re-read the active
 * pages set and re-partition without a restart.
 */
export const PAGE_ACTIVATION_SCRIPT = `
local activePagesKey = KEYS[1]
local epochKey       = KEYS[2]
local pageId         = ARGV[1]
local timestamp      = ARGV[2]

redis.call('ZADD', activePagesKey, timestamp, pageId)
return redis.call('INCR', epochKey)
`;
