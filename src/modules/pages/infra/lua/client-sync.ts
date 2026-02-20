/**
 * Lua: Client Sync — Bidirectional merge for getPageSnapshot
 *
 * Called when a client provides its own snapshot during getPageSnapshot.
 * This allows clients to upload offline edits to the server at reconnect time,
 * so other subscribers receive the client's changes via pub/sub.
 *
 * WHY ATOMIC: The XADD and SETEX (dedup) must be atomic.
 * Both XLEN backpressure AND dedupe checks apply (same as ATOMIC_PAGE_UPDATE_SCRIPT).
 *
 * KEYS[1] = page:{pageId}:stream             (Redis Stream)
 * KEYS[2] = page:{pageId}:dedupe:{dedupeId}  (SETEX deduplication key)
 *
 * ARGV[1] = dedupeTtl     (seconds, PageTTLs.DEDUPE)
 * ARGV[2] = update        (base64-encoded Yjs diff that server doesn't have)
 * ARGV[3] = pageId
 * ARGV[4] = userId        (client userId)
 * ARGV[5] = dedupeId      (UUID for this sync operation — prevents double-write on retry)
 * ARGV[6] = maxStreamLen  (backpressure threshold)
 *
 * RETURNS: flat 3-element array [ok:'1'|'0', streamId:string, status:string]
 *   status = 'ok' | 'duplicate' | 'backpressure'
 *
 * NOTE: Identical logic to ATOMIC_PAGE_UPDATE_SCRIPT by design.
 * Kept as a separate export so callers can use a distinct SHA and
 * identify client-sync entries in logging/tracing.
 */
export const CLIENT_SYNC_SCRIPT = `
local streamKey  = KEYS[1]
local dedupeKey  = KEYS[2]
local dedupeTtl  = tonumber(ARGV[1])
local update     = ARGV[2]
local pageId     = ARGV[3]
local userId     = ARGV[4]
local dedupeId   = ARGV[5]
local maxLen     = tonumber(ARGV[6])

if redis.call('EXISTS', dedupeKey) == 1 then
  return {0, '', 'duplicate'}
end

if redis.call('XLEN', streamKey) >= maxLen then
  return {0, '', 'backpressure'}
end

local streamId = redis.call(
  'XADD', streamKey, 'MAXLEN', '~', maxLen, '*',
  'pageId',   pageId,
  'update',   update,
  'userId',   userId,
  'dedupeId', dedupeId,
  'source',   'client-sync'
)

redis.call('SETEX', dedupeKey, dedupeTtl, '1')

return {1, streamId, 'ok'}
`;
