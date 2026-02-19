/**
 * Lua: Presence Tracking
 *
 * Two atomic scripts for handling subscriber lifecycle:
 * 1. PRESENCE_TRACKING_SCRIPT — tracks a user joining a page session
 * 2. PAGE_ACTIVATION_SCRIPT   — marks a page as "active" when the first subscriber joins
 *
 * WHY LUA:
 * Without atomicity, two concurrent sockets for the same user could BOTH:
 * - See isNew=1 and trigger duplicate "user-joined" broadcasts
 * - See count=1 and both call PAGE_ACTIVATION_SCRIPT → double epoch bump
 * Lua scripts execute atomically on the Redis server, eliminating this race.
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
 *   isNew = 1 → this is a NEW entry (first socket for this user)
 *   isNew = 0 → user was already in the ZSET (reconnect / second socket)
 *
 * LOGIC:
 *   1. ZADD NX → detects if member is new (only adds if not exists)
 *   2. ZADD (no NX) → updates timestamp for existing members (refreshes score)
 *   3. EXPIRE → prevents ZSET from living forever if cleanup script never fires
 *   4. ZCARD → current subscriber count after the add
 *   5. Return [isNew, count]
 *
 * TODO: implement script body
 */
export const PRESENCE_TRACKING_SCRIPT = `
local membersKey = KEYS[1]
local userId    = ARGV[1]
local timestamp = ARGV[2]
local ttl       = tonumber(ARGV[3])

-- TODO: local isNew = redis.call('ZADD', membersKey, 'NX', timestamp, userId)
-- TODO: redis.call('ZADD', membersKey, timestamp, userId)
-- TODO: redis.call('EXPIRE', membersKey, ttl)
-- TODO: local count = redis.call('ZCARD', membersKey)
-- TODO: return {isNew, count}

return {0, 0}
`;

// ─── Script 2: Page Activation ────────────────────────────────────────────────

/**
 * Marks a page as active in the system-wide ZSET and bumps the epoch counter.
 * Called ONLY when PRESENCE_TRACKING returns isNew=1 AND count=1 (very first subscriber).
 *
 * KEYS[1] = sys:pages:active  (ZSET)
 * KEYS[2] = sys:pages:epoch   (string counter)
 * ARGV[1] = pageId
 * ARGV[2] = current timestamp (epoch ms as string, used as ZSET score)
 *
 * RETURNS: new epoch value (integer)
 *
 * SIDE EFFECT:
 * Bumping the epoch signals all stream worker instances to re-read the active pages
 * set and re-partition. This is how a new page gets picked up for stream consumption
 * without a restart.
 *
 * TODO: implement script body
 */
export const PAGE_ACTIVATION_SCRIPT = `
local activePagesKey = KEYS[1]
local epochKey       = KEYS[2]
local pageId         = ARGV[1]
local timestamp      = ARGV[2]

-- TODO: redis.call('ZADD', activePagesKey, timestamp, pageId)
-- TODO: return redis.call('INCR', epochKey)

return 0
`;
