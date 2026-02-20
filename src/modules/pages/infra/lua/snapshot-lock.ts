/**
 * Lua: Safe Snapshot Lock Release
 *
 * WHY ATOMIC + OWNERSHIP CHECK:
 * Scenario without this script:
 *   1. Worker A acquires snapshot lock at T=0 (lock TTL=300s)
 *   2. Worker A stalls (GC pause, network delay, etc.)
 *   3. Lock expires at T=300. Worker B acquires a new lock.
 *   4. Worker A resumes and calls DEL on the lock key.
 *   5. Worker B's lock is deleted — two workers now rebuild simultaneously.
 *
 * This script only DELetes if the lock value still matches this consumer's name,
 * making the release safe even if the lock has already expired and been re-acquired.
 *
 * KEYS[1] = page:{pageId}:snapshot:lock
 * ARGV[1] = consumerName — unique worker ID (e.g. `worker-${hostname}-${pid}`)
 *
 * RETURNS: 1 if released, 0 if not owner (expired + re-acquired by another worker)
 */
export const SNAPSHOT_LOCK_RELEASE_SCRIPT = `
local lockKey      = KEYS[1]
local consumerName = ARGV[1]

local current = redis.call('GET', lockKey)
if current == consumerName then
  redis.call('DEL', lockKey)
  return 1
end
return 0
`;
