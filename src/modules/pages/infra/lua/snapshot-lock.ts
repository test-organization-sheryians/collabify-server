/**
 * Lua: Safe Snapshot Lock Release
 *
 * WHY ATOMIC + OWNERSHIP CHECK:
 * Scenario without this script:
 *   1. Worker A acquires snapshot lock at T=0 (lock TTL=300s)
 *   2. Worker A takes very long (network stall, GC pause, etc.)
 *   3. Lock expires at T=300. Worker B acquires a new lock.
 *   4. Worker A resumes and calls DEL on the lock key.
 *   5. Worker B's lock is deleted — two workers now rebuild simultaneously.
 *
 * This script only DELetes if the lock value still matches CONSUMER_NAME,
 * making the release safe even if the lock has already expired and been re-acquired.
 */

/**
 * KEYS[1] = page:{pageId}:snapshot:lock
 *
 * ARGV[1] = consumerName (the unique CONSUMER_NAME of the worker that acquired the lock)
 *           Format: `worker-${hostname()}-${process.pid}`
 *
 * RETURNS: 1 if lock was released, 0 if lock was not owned by this consumer
 *
 * LOGIC:
 *   1. GET lockKey → compare value to consumerName
 *   2. If matches: DEL lockKey, return 1
 *   3. If not matches (expired + re-acquired by another worker): return 0
 *
 * TODO: implement script body
 */
export const SNAPSHOT_LOCK_RELEASE_SCRIPT = `
local lockKey      = KEYS[1]
local consumerName = ARGV[1]

-- TODO: local current = redis.call('GET', lockKey)
-- TODO: if current == consumerName then
--         redis.call('DEL', lockKey)
--         return 1
--       end
-- TODO: return 0

return 0
`;
