import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { WhiteboardKeys } from "../../infra/whiteboard-keys";
import { downloadSnapshot } from "../../infra/s3-client";
import type { GetBoardSnapshotInput, BoardSnapshot } from "./types";
import { Y } from "@/shared/yjs";
import { LockingService } from "@/services/locking/locking.service";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("whiteboard:queries:get-snapshot");

/**
 * Compare Redis stream IDs numerically
 * Stream ID format: "{milliseconds}-{sequence}"
 * 🔥 CRITICAL: String comparison is WRONG ("10-0" < "9-0" lexically)
 */
function compareStreamIds(a: string, b: string): number {
  const [aMs, aSeq] = a.split("-").map(Number);
  const [bMs, bSeq] = b.split("-").map(Number);
  if (aMs !== bMs) return aMs - bMs;
  return aSeq - bSeq;
}

/**
 * Get Board Snapshot Handler (V4 - Production Hardened)
 *
 * **Architecture:** Cache-first with MANDATORY stream delta merge
 *
 * Flow:
 * 1. Authorization: Verify user is collaborator/creator
 * 2. Try Redis cache (worker-maintained, may be 0-5s stale)
 *    - If HIT: Use cached binary + streamId as base
 * 3. If MISS: Cold start from S3 + lastSnapshotStreamId
 *    - 🔥 Cold-start lock prevents thundering herd
 * 4. **CRITICAL:** ALWAYS merge unmerged stream updates (catches up with worker lag)
 *    - 🔥 Yields between batches to prevent event loop blocking
 * 5. Warm cache with latest merged state
 *    - 🔥 Version comparison prevents cache regression
 * 6. Use state vector to compute diff (bandwidth optimization)
 * 7. Return diff + metadata
 *
 * **Performance:**
 * - Cache hit: ~15-30ms (Redis + 0-10 delta updates)
 * - Cache miss: ~100-200ms (S3 + full stream replay)
 *
 * **Production Hardening:**
 * - Thundering herd prevention (cold-start lock)
 * - Event loop yielding (prevents latency spikes)
 * - Cache version comparison (prevents regression)
 * - StreamId normalization (never null)
 * - S3 timeout protection (10s max)
 */
export const handler = async (
  input: GetBoardSnapshotInput,
  ctx: ServiceContext
): Promise<BoardSnapshot> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  const { boardId, stateVector } = input;

  logger.info("📥 get-board-snapshot: Handler entry", { boardId, userId });

  // 🔥 CRITICAL FIX: Request-unique lock owner (NOT userId)
  // Multiple tabs from same user = same userId = lock interference
  const lockOwner = `req-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  try {
    // 1. Validate access (MUST check on every query - stateless HTTP)
    const board = await ctx.db.whiteboard.findFirst({
      where: {
        id: boardId,
        OR: [{ createdBy: userId }, { collaborators: { some: { userId } } }],
        deletedAt: null,
      },
      select: {
        id: true,
        s3Key: true,
        lastSnapshotStreamId: true,
        lastSnapshotAt: true,
      },
    });

    if (!board) {
      logger.warn("❌ Board not found or access denied", { boardId, userId });
      throw AppError.forbidden(
        "Whiteboard not found or you do not have access"
      );
    }

    logger.info("✅ Board found and access granted", {
      boardId,
      s3Key: board.s3Key,
      lastSnapshotStreamId: board.lastSnapshotStreamId,
    });

    // 2. Try Redis cache (worker-maintained, but may be 0-5s stale)
    const cacheKey = WhiteboardKeys.BoardSnapshot(board.id);
    logger.info("🔍 Checking Redis cache", { cacheKey });
    const cachedJSON = await ctx.redis.get(cacheKey);

    let baseDoc: InstanceType<typeof Y.Doc>;
    let startStreamId: string;

    if (cachedJSON) {
      // CACHE HIT: Use worker's cache as base, then merge delta
      try {
        const cacheData = JSON.parse(cachedJSON) as {
          binary: string;
          streamId: string;
          updatedAt: number;
        };

        const binary = Buffer.from(cacheData.binary, "base64");
        baseDoc = new Y.Doc();
        Y.applyUpdate(baseDoc, binary);
        startStreamId = cacheData.streamId || "0-0";
      } catch (parseError) {
        // Corrupted cache - fall through to S3 cold start
        baseDoc = new Y.Doc();
        startStreamId = board.lastSnapshotStreamId || "0-0";

        // 🔥 FIX #1: Cold-start lock (thundering herd prevention) via LockingService
        const lockKey = `lock:board:snapshot:${boardId}`;
        const lockAcquired = await LockingService.acquire(
          lockKey,
          lockOwner,
          10
        );

        if (!lockAcquired) {
          // 🔥 CRITICAL FIX: Proper retry loop (not single 100ms wait)
          // Poll for cache up to lock TTL (10s) with exponential backoff
          for (let attempt = 0; attempt < 10; attempt++) {
            await new Promise((r) =>
              setTimeout(r, 50 * Math.pow(1.5, attempt))
            ); // 50ms, 75ms, 112ms...
            const retryCache = await ctx.redis.get(cacheKey);
            if (retryCache) {
              const retryData = JSON.parse(retryCache) as {
                binary: string;
                streamId: string;
              };
              const binary = Buffer.from(retryData.binary, "base64");
              Y.applyUpdate(baseDoc, binary);
              startStreamId = retryData.streamId || "0-0";
              break; // Cache warmed, exit retry loop
            }
          }
          // If still no cache after retries, proceed to S3 (lock holder may have failed)
          if (
            !startStreamId ||
            startStreamId === board.lastSnapshotStreamId ||
            "0-0"
          ) {
            if (board.s3Key) {
              try {
                // 🔥 FIX #5: S3 timeout protection (10s max)
                const s3Binary = await Promise.race([
                  downloadSnapshot(board.s3Key),
                  new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error("S3 timeout")), 10000)
                  ),
                ]);
                Y.applyUpdate(baseDoc, s3Binary);
              } catch (s3Error) {
                // S3 download failed - start with empty doc
              }
            }
          }
        } else {
          // We own the lock, proceed with S3 cold start
          try {
            if (board.s3Key) {
              // 🔥 FIX #5: S3 timeout protection (10s max)
              const s3Binary = await Promise.race([
                downloadSnapshot(board.s3Key),
                new Promise<never>((_, reject) =>
                  setTimeout(() => reject(new Error("S3 timeout")), 10000)
                ),
              ]);
              Y.applyUpdate(baseDoc, s3Binary);
            }
          } finally {
            // Always release lock
            await LockingService.release(lockKey, lockOwner);
          }
        }
      }
    } else {
      // CACHE MISS: Cold start from S3, then merge ALL stream delta
      logger.warn("❌ Cache MISS - initiating cold start", { boardId });
      baseDoc = new Y.Doc();
      startStreamId = board.lastSnapshotStreamId || "0-0";

      // 🔥 FIX #1: Cold-start lock (thundering herd prevention) via LockingService
      const lockKey = `lock:board:snapshot:${boardId}`;
      logger.info("🔒 Attempting to acquire cold-start lock", {
        lockKey,
        lockOwner,
      });
      const lockAcquired = await LockingService.acquire(lockKey, lockOwner, 10);

      if (!lockAcquired) {
        logger.info("⏳ Lock not acquired - waiting for other request", {
          boardId,
        });
        // 🔥 CRITICAL FIX: Proper retry loop (not single 100ms wait)
        // Poll for cache up to lock TTL (10s) with exponential backoff
        for (let attempt = 0; attempt < 10; attempt++) {
          await new Promise((r) => setTimeout(r, 50 * Math.pow(1.5, attempt))); // 50ms, 75ms, 112ms...
          const retryCache = await ctx.redis.get(cacheKey);
          if (retryCache) {
            const retryData = JSON.parse(retryCache) as {
              binary: string;
              streamId: string;
            };
            const binary = Buffer.from(retryData.binary, "base64");
            Y.applyUpdate(baseDoc, binary);
            startStreamId = retryData.streamId || "0-0";
            break; // Cache warmed, exit retry loop
          }
        }
        // If still no cache after retries, proceed to S3 (lock holder may have failed)
        if (
          !startStreamId ||
          startStreamId === board.lastSnapshotStreamId ||
          "0-0"
        ) {
          if (board.s3Key) {
            try {
              // 🔥 FIX #5: S3 timeout protection (10s max)
              const s3Binary = await Promise.race([
                downloadSnapshot(board.s3Key),
                new Promise<never>((_, reject) =>
                  setTimeout(() => reject(new Error("S3 timeout")), 10000)
                ),
              ]);
              Y.applyUpdate(baseDoc, s3Binary);
            } catch (s3Error) {
              // S3 download failed - start with empty doc
            }
          }
        }
      } else {
        // We own the lock, proceed with S3 cold start
        logger.info("✅ Lock acquired - proceeding with S3 download", {
          boardId,
          s3Key: board.s3Key,
        });
        try {
          if (board.s3Key) {
            logger.info("☁️  Downloading snapshot from S3", {
              boardId,
              s3Key: board.s3Key,
            });
            // 🔥 FIX #5: S3 timeout protection (10s max)
            const s3Binary = await Promise.race([
              downloadSnapshot(board.s3Key),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("S3 timeout")), 10000)
              ),
            ]);
            Y.applyUpdate(baseDoc, s3Binary);
            logger.info("✅ S3 snapshot applied successfully", {
              boardId,
              snapshotSize: s3Binary.length,
            });
          } else {
            logger.info("ℹ️  No S3 snapshot - starting with empty doc", {
              boardId,
            });
          }
        } finally {
          // Always release lock
          await LockingService.release(lockKey, lockOwner);
        }
      }
    }

    // 3. CRITICAL: ALWAYS merge unmerged stream updates
    // Worker updates Redis every 5s (debounced).
    // In those 5s, stream accumulates 0-50 updates.
    // Handler MUST merge these to return absolute latest state.
    const streamKey = WhiteboardKeys.BoardStream(board.id);
    let cursor = startStreamId;
    let totalReplayed = 0;
    const MAX_REPLAY = 50000; // Safety: prevent OOM
    let lastStreamId: string | null = null;

    while (totalReplayed < MAX_REPLAY) {
      const batch = (await ctx.redis.xrange(
        streamKey,
        `(${cursor}`, // Exclusive start (don't re-apply startStreamId)
        "+",
        "COUNT",
        5000
      )) as Array<[string, string[]]>;

      if (batch.length === 0) break;

      for (const [id, fields] of batch) {
        // Parse Redis stream fields: ["boardId", "abc", "update", "base64...", ...]
        const data: Record<string, string> = {};
        for (let i = 0; i < fields.length; i += 2) {
          data[fields[i]] = fields[i + 1];
        }

        const updateB64 = data.update;
        if (updateB64) {
          const update = Buffer.from(updateB64, "base64");
          Y.applyUpdate(baseDoc, update);
          lastStreamId = id;
        }
      }

      totalReplayed += batch.length;
      cursor = batch[batch.length - 1][0];

      // 🔥 FIX #2: Yield event loop between large batches
      if (batch.length === 5000) {
        await new Promise((resolve) => setImmediate(resolve));
      }
    }

    // 🔥 CRITICAL: Log if MAX_REPLAY hit (silent truncation)
    if (totalReplayed >= MAX_REPLAY) {
      logger.warn("⚠️  MAX_REPLAY limit reached - stream replay truncated", {
        boardId,
        totalReplayed,
        MAX_REPLAY,
      });
    }

    logger.info("✅ Stream replay complete", {
      boardId,
      totalReplayed,
      lastStreamId,
    });

    // 4. Warm cache for next query (with version comparison)
    if (totalReplayed > 0 || cachedJSON) {
      try {
        const latestStreamId = lastStreamId || startStreamId;
        const freshBinary = Y.encodeStateAsUpdate(baseDoc);

        // 🔥 FIX #3: Cache version comparison (prevent regression)
        // Only write if our streamId >= existing streamId
        let shouldWriteCache = true;
        if (cachedJSON) {
          try {
            const existingCache = JSON.parse(cachedJSON) as {
              streamId: string;
            };
            // 🔥 CRITICAL FIX: Numeric comparison (string comparison is WRONG)
            // "10-0" < "9-0" lexically, but 10 > 9 numerically
            if (compareStreamIds(latestStreamId, existingCache.streamId) < 0) {
              shouldWriteCache = false; // Don't regress cache
            }
          } catch {
            // Ignore parse error, write cache anyway
          }
        }

        if (shouldWriteCache) {
          const cachePayload = {
            binary: Buffer.from(freshBinary).toString("base64"),
            streamId: latestStreamId,
            updatedAt: Date.now(),
          };
          await ctx.redis.setex(
            cacheKey,
            604800, // 7 days TTL
            JSON.stringify(cachePayload)
          );
        }
      } catch (cacheError) {
        // Cache write failed - not critical, continue
      }
    }

    // 5. Compute diff using state vector (bandwidth optimization)
    let clientStateVector: Uint8Array | undefined;
    if (stateVector) {
      try {
        clientStateVector = Buffer.from(stateVector, "base64");
      } catch {
        // Invalid state vector - ignore, return full state
        clientStateVector = undefined;
      }
    }

    // Generate diff (or full state if no state vector)
    const diff = Y.encodeStateAsUpdate(baseDoc, clientStateVector);
    const snapshotB64 = Buffer.from(diff).toString("base64");

    // 🔥 FIX #4: Normalize streamId to "0-0" (never null)
    const normalizedStreamId = lastStreamId || startStreamId || "0-0";

    // 6. Return result
    return {
      boardId: board.id,
      snapshot: snapshotB64,
      lastStreamId: normalizedStreamId,
      snapshotTimestamp: board.lastSnapshotAt,
    };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      logger.warn("⚠️  Known error in get-board-snapshot", {
        error,
        boardId,
        userId,
      });
      throw error;
    }

    // Unexpected error - log details and throw generic error
    logger.error("❌ UNEXPECTED ERROR in get-board-snapshot", {
      error,
      boardId,
      userId,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      errorName: error instanceof Error ? error.name : undefined,
    });
    throw new AppError("Failed to fetch board snapshot");
  }
};
