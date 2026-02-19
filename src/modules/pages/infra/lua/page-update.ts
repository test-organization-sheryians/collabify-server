/**
 * Lua: Atomic Page Update (Hot Path)
 *
 * This is the most performance-sensitive script in the module.
 * Target: <5ms per invocation at p99.
 *
 * WHY ATOMIC:
 * The dedupeKey check and XADD MUST happen in the same atomic operation.
 * Without atomicity, two concurrent sockets retrying the same update (same dedupeId)
 * could both pass the EXISTS check before either executes XADD,
 * resulting in duplicate stream entries from a single client update.
 */

/**
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
 * RETURNS: { ok: '1'|'0', streamId: string, status: 'ok'|'duplicate'|'backpressure' }
 * (as a flat 3-element array: [ok, streamId, status])
 *
 * LOGIC:
 *   1. EXISTS dedupeKey → if 1, return {ok:0, streamId:'', status:'duplicate'}
 *      Client already processed this update — safe to ACK without re-adding to stream.
 *
 *   2. XLEN streamKey → if >= maxStreamLength, return {ok:0, streamId:'', status:'backpressure'}
 *      Stream worker is behind. Signal client to slow down (backpressure).
 *      Client should use exponential backoff and retry.
 *
 *   3. XADD streamKey MAXLEN ~ maxStreamLength * entry fields
 *      MAXLEN ~ = approximate trimming (O(1) amortized vs O(N) for exact).
 *      Fields: pageId, update, userId, dedupeId
 *
 *   4. SETEX dedupeKey dedupeTtl '1'
 *      Mark as processed for the deduplication window.
 *
 *   5. Return {ok:1, streamId: <xadd result>, status:'ok'}
 *
 * TODO: implement script body
 */
export const ATOMIC_PAGE_UPDATE_SCRIPT = `
local streamKey    = KEYS[1]
local dedupeKey    = KEYS[2]
local dedupeTtl    = tonumber(ARGV[1])
local update       = ARGV[2]
local pageId       = ARGV[3]
local userId       = ARGV[4]
local dedupeId     = ARGV[5]
local maxLen       = tonumber(ARGV[6])

-- TODO: if redis.call('EXISTS', dedupeKey) == 1 then return {0, '', 'duplicate'} end
-- TODO: if redis.call('XLEN', streamKey) >= maxLen then return {0, '', 'backpressure'} end
-- TODO: local streamId = redis.call('XADD', streamKey, 'MAXLEN', '~', maxLen, '*',
--         'pageId', pageId, 'update', update, 'userId', userId, 'dedupeId', dedupeId)
-- TODO: redis.call('SETEX', dedupeKey, dedupeTtl, '1')
-- TODO: return {1, streamId, 'ok'}

return {0, '', 'not-implemented'}
`;
