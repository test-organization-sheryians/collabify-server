/**
 * Lua: Atomic Page Update (Hot Path)
 *
 * WHY ATOMIC: The dedupeKey check and XADD MUST happen in the same atomic
 * operation. Without atomicity, two concurrent sockets retrying the same update
 * (same dedupeId) could both pass the EXISTS check before either executes XADD,
 * resulting in duplicate stream entries.
 *
 * KEYS[1] = page:{pageId}:stream             (Redis Stream)
 * KEYS[2] = page:{pageId}:dedupe:{dedupeId}  (SETEX deduplication key)
 *
 * ARGV[1] = dedupeTtl         (seconds, PageTTLs.DEDUPE)
 * ARGV[2] = update            (base64-encoded Yjs XmlFragment binary delta)
 * ARGV[3] = pageId
 * ARGV[4] = userId
 * ARGV[5] = dedupeId          (UUID from client)
 * ARGV[6] = maxStreamLength   (backpressure threshold, from config.MAX_STREAM_LENGTH)
 *
 * RETURNS: flat 3-element array [ok:'1'|'0', streamId:string, status:string]
 *   status = 'ok' | 'duplicate' | 'backpressure'
 */
export const ATOMIC_PAGE_UPDATE_SCRIPT = `
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
  'dedupeId', dedupeId
)

redis.call('SETEX', dedupeKey, dedupeTtl, '1')

return {1, streamId, 'ok'}
`;
