/**
 * Lua: Subscriber Cleanup & Page Deactivation
 *
 * WHY ATOMIC:
 * Two concurrent unsubscribes for the last two users on a page could both
 * see count=1 before either fires. Without atomicity:
 * - Both would attempt page deactivation → double ZREM on sys:pages:active
 * - Both would consider themselves the "last" → duplicate cleanup logic
 * This script makes ZREM + ZCARD + conditional deactivation atomic.
 */

/**
 * KEYS[1] = page:{pageId}:subscribers  (ZSET)
 * KEYS[2] = sys:pages:active           (ZSET)
 *
 * ARGV[1] = userId
 * ARGV[2] = pageId
 *
 * RETURNS: 1 if page was deactivated (last subscriber left), 0 if subscribers remain
 *
 * LOGIC:
 *   1. ZREM subscribers userId         → remove this user
 *   2. ZCARD subscribers              → remaining subscriber count
 *   3. If count == 0:
 *        ZREM sys:pages:active pageId → deactivate page (no stream worker will pick it up)
 *        return 1
 *   4. Else: return 0                  → page still has active subscribers
 *
 * SIDE EFFECT when returning 1:
 * Stream worker will no longer see this page in ZRANGEBYSCORE sys:pages:active
 * on its next epoch check, so it stops consuming the stream naturally.
 * No explicit signal to the stream worker is needed.
 *
 * TODO: implement script body
 */
export const UNSUBSCRIBE_CLEANUP_SCRIPT = `
local subscribersKey = KEYS[1]
local activePagesKey = KEYS[2]
local userId         = ARGV[1]
local pageId         = ARGV[2]

-- TODO: redis.call('ZREM', subscribersKey, userId)
-- TODO: local remaining = redis.call('ZCARD', subscribersKey)
-- TODO: if remaining == 0 then
--         redis.call('ZREM', activePagesKey, pageId)
--         return 1
--       end
-- TODO: return 0

return 0
`;
