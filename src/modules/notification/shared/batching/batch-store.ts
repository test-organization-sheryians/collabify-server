import { redis } from "@/infra/redis";
import { REDIS_KEYS, TTL } from "../../constants";
import { createLogger } from "@/shared/lib/logger";
import type { BatchEntry, BatchKey } from "./batch-types";

// =============================================================================
// Batch Store
//
// Wraps a Redis Hash to accumulate notification events in a batch bucket.
// Each bucket is a Redis Hash: field=eventId, value=serialized BatchEntry.
//
// Key pattern: `notif:batch:{userId}:{eventType}:{groupByValue}`
//
// CRITICAL: getAndClear() uses a Lua script to atomically read + delete
// in one round trip. Without this, two concurrent flushes could both
// read the same data and produce duplicate notifications.
// =============================================================================

const logger = createLogger("notification:shared:batch-store");

// Lua script: atomically get all hash entries and delete the key
// Returns a flat array: [field1, value1, field2, value2, ...] or nil
const GET_AND_CLEAR_SCRIPT = `
  local data = redis.call('HGETALL', KEYS[1])
  if #data > 0 then
    redis.call('DEL', KEYS[1])
  end
  return data
`;

/**
 * Append a batch entry to the bucket.
 * @returns the new entry count in the bucket (used by BatchEngine to check maxSize).
 */
export async function append(
  batchKey: BatchKey,
  entry:    BatchEntry
): Promise<number> {
  const ttl = Math.ceil(TTL.PREF_GLOBAL); // reuse a reasonable TTL as bucket safety net
  const serialized = JSON.stringify(entry);

  try {
    await redis.hset(batchKey, entry.eventId, serialized);
    // Refresh TTL on every append — bucket expires if never flushed
    await redis.expire(batchKey, ttl);
    const count = await redis.hlen(batchKey);
    return count;
  } catch (err) {
    logger.error("Batch store: append failed", { err, batchKey, eventId: entry.eventId });
    throw err;
  }
}

/**
 * Atomically read all entries from the bucket and delete it.
 * Returns null if the bucket was already cleared (concurrent flush).
 */
export async function getAndClear(batchKey: BatchKey): Promise<BatchEntry[] | null> {
  try {
    const result = await redis.eval(
      GET_AND_CLEAR_SCRIPT,
      1, // number of keys
      batchKey
    ) as string[];

    if (!result || result.length === 0) {
      logger.debug("Batch store: bucket already cleared (concurrent flush)", { batchKey });
      return null;
    }

    // Redis HGETALL returns flat array: [field, value, field, value, ...]
    const entries: BatchEntry[] = [];
    for (let i = 0; i < result.length; i += 2) {
      try {
        entries.push(JSON.parse(result[i + 1]) as BatchEntry);
      } catch {
        logger.warn("Batch store: failed to parse entry", { raw: result[i + 1] });
      }
    }
    return entries;
  } catch (err) {
    logger.error("Batch store: getAndClear failed", { err, batchKey });
    throw err;
  }
}

/**
 * Build a standardized batch key from its components.
 */
export function buildBatchKey(
  userId:       string,
  eventType:    string,
  groupByValue: string
): BatchKey {
  return `${REDIS_KEYS.BATCH_PREFIX}${userId}:${eventType}:${groupByValue}`;
}
