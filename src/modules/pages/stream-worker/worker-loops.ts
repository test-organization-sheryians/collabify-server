/**
 * Stream Worker Loops — 3 cooperative async loops.
 *
 * processLoop:   XREADGROUP → applyUpdateBatch → shouldSnapshot → rebuildPageSnapshot
 * heartbeatLoop: ZADD sys:page-workers every HEARTBEAT_INTERVAL_MS
 * recoveryLoop:  XAUTOCLAIM PEL entries from dead workers
 *
 * All loops respect state.isRunning — set to false on SIGTERM for graceful shutdown.
 */

import type { Redis } from "ioredis";
import type { PrismaClient } from "@prisma/client";
import { createLogger } from "@/shared/lib/logger";
import { PageKeys } from "../infra/page-keys";
import {
  ownsPage,
  registerHeartbeat,
  pruneDeadWorkers,
} from "../infra/worker-coordinator";
import {
  applyUpdateBatch,
  shouldSnapshot,
  rebuildPageSnapshot,
} from "./processor";
import {
  CONSUMER_NAME,
  WORKER_GROUP_NAME,
  BATCH_SIZE,
  BLOCK_TIMEOUT_MS,
  HEARTBEAT_INTERVAL_MS,
  PEL_CLAIM_THRESHOLD_MS,
  RECOVERY_BATCH_SIZE,
} from "./config";
import type { WorkerState, RawStreamEntry } from "./types";

const logger = createLogger("pages:stream-worker:loops");

// ─── Process Loop ─────────────────────────────────────────────────────────────

export async function processLoop(
  state: WorkerState,
  redis: Redis,
  db: PrismaClient
): Promise<void> {
  logger.info("Process loop started", {
    workerIndex: state.workerIndex,
    workerCount: state.workerCount,
    consumerName: state.consumerName,
  });

  while (state.isRunning) {
    const cycleStart = Date.now();

    try {
      // Epoch check — re-partition when active pages set changes
      const epoch = (await redis.get(PageKeys.SysPagesEpoch())) ?? "0";
      if (epoch !== state.lastSeenEpoch) {
        logger.info("Epoch changed — re-partitioning", {
          prev: state.lastSeenEpoch,
          next: epoch,
        });
        state.lastSeenEpoch = epoch;
      }

      // Get all active pages — use active set (not SCAN)
      const activePageIds = await redis.zrange(
        PageKeys.SysActivePages(),
        0,
        -1
      );
      const myPages = activePageIds.filter((id) => ownsPage(id));

      state.metrics.activePagesOwned = myPages.length;

      if (myPages.length === 0) {
        // No owned pages — idle wait
        await sleep(BLOCK_TIMEOUT_MS);
        continue;
      }

      for (const pageId of myPages) {
        if (!state.isRunning) break;

        const streamKey = PageKeys.PageStream(pageId);

        let rawResult: unknown;
        try {
          rawResult = await redis.xreadgroup(
            "GROUP",
            WORKER_GROUP_NAME,
            CONSUMER_NAME,
            "COUNT",
            BATCH_SIZE,
            "BLOCK",
            BLOCK_TIMEOUT_MS,
            "STREAMS",
            streamKey,
            ">"
          );
        } catch (err: any) {
          // Stream deleted mid-read (e.g. page hard-deleted)
          if (!err?.message && err?.command?.name === "xreadgroup") {
            logger.debug("Stream deleted mid-read — skipping", { pageId });
          } else if (err?.message?.includes("NOGROUP")) {
            logger.warn("NOGROUP — group may not exist yet", { pageId });
          } else {
            logger.error("XREADGROUP failed", { pageId, err });
            state.metrics.redisErrors++;
          }
          continue;
        }

        if (!rawResult) continue;

        const entries = parseXreadgroupResult(rawResult);
        if (entries.length === 0) continue;

        const startTime = Date.now();

        try {
          // Build Y.Doc from batch
          const result = applyUpdateBatch(entries);

          // XACK all entries (move out of PEL)
          await redis.xack(
            streamKey,
            WORKER_GROUP_NAME,
            ...entries.map((e) => e.id)
          );

          // Decide whether to snapshot
          if (await shouldSnapshot(pageId, state.thresholdRegistry, redis)) {
            await rebuildPageSnapshot(
              pageId,
              result.doc, // doc ownership passes to rebuildPageSnapshot (it .destroy()s it)
              redis,
              db,
              CONSUMER_NAME
            );
            state.metrics.snapshotsCreated++;
          } else {
            result.doc.destroy(); // ALWAYS destroy when not snapshotting
          }

          state.metrics.updatesProcessed += entries.length;
          state.metrics.pagesProcessed++;

          const duration = Date.now() - startTime;
          state.metrics.avgProcessingTimeMs =
            state.metrics.avgProcessingTimeMs * 0.9 + duration * 0.1;

          logger.debug("Batch processed", {
            pageId,
            count: entries.length,
            latencyMs: duration,
          });
        } catch (err) {
          logger.error("Batch processing failed", { pageId, err });
        }

        // Yield event loop between pages
        await sleep(0);
      }

      state.metrics.lastCycleMs = Date.now() - cycleStart;
    } catch (err: any) {
      logger.error("Process loop error", { err });
      state.metrics.redisErrors++;
      await sleep(1_000);
    }
  }

  logger.info("Process loop stopped");
}

// ─── Heartbeat Loop ───────────────────────────────────────────────────────────

export async function heartbeatLoop(
  state: WorkerState,
  redis: Redis
): Promise<void> {
  logger.info("Heartbeat loop started");

  while (state.isRunning) {
    await sleep(HEARTBEAT_INTERVAL_MS);

    try {
      await registerHeartbeat(redis);
      logger.debug("Heartbeat registered");
    } catch (err) {
      logger.error("Heartbeat failed", { err });
    }
  }

  logger.info("Heartbeat loop stopped");
}

// ─── Recovery Loop ────────────────────────────────────────────────────────────

export async function recoveryLoop(
  state: WorkerState,
  redis: Redis,
  db: PrismaClient
): Promise<void> {
  logger.info("Recovery loop started");

  while (state.isRunning) {
    await sleep(PEL_CLAIM_THRESHOLD_MS);

    try {
      // Prune stale worker registrations first
      const pruned = await pruneDeadWorkers(redis);
      if (pruned > 0) {
        logger.info("Pruned dead workers", { count: pruned });
      }

      const activePageIds = await redis.zrange(
        PageKeys.SysActivePages(),
        0,
        -1
      );
      const myPages = activePageIds.filter((id) => ownsPage(id));

      for (const pageId of myPages) {
        if (!state.isRunning) break;

        const streamKey = PageKeys.PageStream(pageId);
        let cursor = "0-0";

        // Paginate XAUTOCLAIM until no more pending entries
        while (true) {
          let claimed: [string, Array<[string, string[]]>];
          try {
            claimed = (await redis.xautoclaim(
              streamKey,
              WORKER_GROUP_NAME,
              CONSUMER_NAME,
              PEL_CLAIM_THRESHOLD_MS,
              cursor,
              "COUNT",
              RECOVERY_BATCH_SIZE
            )) as [string, Array<[string, string[]]>];
          } catch (err) {
            logger.error("XAUTOCLAIM failed", { pageId, err });
            break;
          }

          const [nextCursor, claimedEntries] = claimed;

          if (claimedEntries.length > 0) {
            logger.info("Claimed PEL entries from dead worker", {
              pageId,
              count: claimedEntries.length,
            });

            const entries = claimedEntries
              .map(([id, fields]) => parseFlatEntry(pageId, id, fields))
              .filter((e): e is RawStreamEntry => e !== null);

            if (entries.length > 0) {
              try {
                const result = applyUpdateBatch(entries);

                await redis.xack(
                  streamKey,
                  WORKER_GROUP_NAME,
                  ...entries.map((e) => e.id)
                );

                if (
                  await shouldSnapshot(pageId, state.thresholdRegistry, redis)
                ) {
                  await rebuildPageSnapshot(
                    pageId,
                    result.doc,
                    redis,
                    db,
                    CONSUMER_NAME
                  );
                  state.metrics.snapshotsCreated++;
                } else {
                  result.doc.destroy();
                }
              } catch (err) {
                logger.error("Recovery batch failed", { pageId, err });
              }
            }
          }

          if (nextCursor === "0-0") break;
          cursor = nextCursor;
        }
      }
    } catch (err) {
      logger.error("Recovery loop error", { err });
    }
  }

  logger.info("Recovery loop stopped");
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

function parseXreadgroupResult(raw: unknown): RawStreamEntry[] {
  const results = raw as Array<[string, Array<[string, string[]]>]>;
  const entries: RawStreamEntry[] = [];

  for (const [, streamEntries] of results) {
    for (const [id, fields] of streamEntries) {
      const entry = parseFlatEntry("", id, fields);
      if (entry) entries.push(entry);
    }
  }

  return entries;
}

function parseFlatEntry(
  pageIdFallback: string,
  id: string,
  fields: string[]
): RawStreamEntry | null {
  const data: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) data[fields[i]] = fields[i + 1];

  const pageId = data.pageId ?? pageIdFallback;
  if (!pageId || !data.update || !data.userId || !data.dedupeId) {
    logger.warn("Invalid stream entry — missing required fields", { id, data });
    return null;
  }

  return {
    id,
    fields: {
      pageId,
      update: data.update,
      userId: data.userId,
      dedupeId: data.dedupeId,
    },
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
