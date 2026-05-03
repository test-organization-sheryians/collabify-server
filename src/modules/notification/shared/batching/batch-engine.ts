import { redis } from "@/infra/redis";
import { REDIS_KEYS, BATCH_DEFAULTS } from "../../constants";
import { batchQueue } from "../queues/queue-registry";
import { append, getAndClear, buildBatchKey } from "./batch-store";
import { createLogger } from "@/shared/lib/logger";
import type { BatchConfig, BatchEntry, BatchKey } from "./batch-types";
import type { BatchJobData } from "../../events/types";

// =============================================================================
// Batch Engine
//
// Orchestrates event accumulation and scheduled flushing.
//
// Flow:
//   1. enqueue() appends the event to the Redis Hash bucket.
//   2. If bucket size >= maxSize → flush() immediately.
//   3. Otherwise → schedule a delayed BullMQ job (if not already scheduled).
//   4. The delayed job fires after config.window ms → BatchWorker calls flush().
//   5. flush() calls getAndClear() (atomic) → returns entries or null (race).
//
// The schedule lock key (`notif:batch:sched:{batchKey}`) prevents duplicate
// delayed jobs from being enqueued when multiple events hit the same bucket
// in rapid succession.
// =============================================================================

const logger = createLogger("notification:shared:batch-engine");

/**
 * Enqueue an event into the appropriate batch bucket.
 * May trigger an immediate flush if maxSize is reached.
 *
 * @returns "batched"  → event added to bucket, delayed flush scheduled.
 * @returns "flushed"  → maxSize reached, immediate flush triggered.
 */
export async function enqueue(
  eventType:    string,
  config:       BatchConfig,
  entry:        BatchEntry,
  groupByValue: string
): Promise<"batched" | "flushed"> {
  const batchKey = buildBatchKey(entry.recipientUserId, eventType, groupByValue);

  const count = await append(batchKey, entry);

  const maxSize = config.maxSize ?? BATCH_DEFAULTS.MAX_SIZE;

  if (count >= maxSize) {
    logger.debug("Batch engine: maxSize reached, triggering immediate flush", {
      batchKey,
      count,
    });
    await triggerFlush(batchKey, eventType);
    return "flushed";
  }

  await scheduleDelayedFlush(batchKey, eventType, config);
  return "batched";
}

/**
 * Flush a batch bucket. Called by BatchWorker when the delayed job fires.
 *
 * @returns BatchEntry[] of all accumulated entries, or null if already flushed.
 */
export async function flush(batchKey: BatchKey): Promise<BatchEntry[] | null> {
  // Clear the schedule lock so future events can schedule a new delayed job
  await clearScheduleLock(batchKey);

  const entries = await getAndClear(batchKey);

  if (!entries || entries.length === 0) {
    return null; // Already flushed by concurrent immediate trigger
  }

  logger.debug("Batch engine: flushed batch bucket", {
    batchKey,
    count: entries.length,
  });

  return entries;
}

// -----------------------------------------------------------------------------
// Internals
// -----------------------------------------------------------------------------

async function scheduleDelayedFlush(
  batchKey:  BatchKey,
  eventType: string,
  config:    BatchConfig
): Promise<void> {
  const schedKey = `${REDIS_KEYS.BATCH_SCHED_PREFIX}${batchKey}`;
  const windowMs = config.window ?? BATCH_DEFAULTS.WINDOW_MS;

  // SET NX — only create the scheduled job if one doesn't already exist for this bucket
  const acquired = await redis.set(schedKey, "1", "EX", Math.ceil(windowMs / 1000) + 10, "NX");

  if (!acquired) {
    // Delayed job already scheduled for this bucket — nothing to do
    return;
  }

  const jobData: BatchJobData = { batchKey, eventType };

  await batchQueue.add(`batch:flush:${batchKey}`, jobData, {
    delay: windowMs,
    // Use deterministic jobId to prevent phantom duplicates if schedKey is
    // cleared between the NX check and the queue.add call
    jobId: `batch:${batchKey}:${Date.now()}`,
  });

  logger.debug("Batch engine: scheduled delayed flush", {
    batchKey,
    delayMs: windowMs,
  });
}

async function triggerFlush(batchKey: BatchKey, eventType: string): Promise<void> {
  const jobData: BatchJobData = { batchKey, eventType };

  await batchQueue.add(`batch:immediate:${batchKey}`, jobData, {
    delay: 0, // immediate
    jobId: `batch:imm:${batchKey}:${Date.now()}`,
  });
}

async function clearScheduleLock(batchKey: BatchKey): Promise<void> {
  const schedKey = `${REDIS_KEYS.BATCH_SCHED_PREFIX}${batchKey}`;
  await redis.del(schedKey).catch(() => {
    /* non-fatal */
  });
}
