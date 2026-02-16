import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { WhiteboardKeys, WhiteboardTTLs } from "../../infra/whiteboard-keys";
import { downloadSnapshot } from "../../infra/s3-client";
import type { GetBoardSnapshotInput, BoardSnapshot } from "./types";
import { Y } from "@/shared/yjs";
import { createLogger } from "@/shared/lib/logger";
import { createSuccessFrame } from "@/infra/ws/types";
import { safeApplyUpdate } from "@/shared/lib/safe-apply-update";

const logger = createLogger("whiteboard:queries:get-snapshot");

/**
 * Client Sync Lua Script (Bidirectional Sync)
 *
 * Atomically handles client→server offline updates:
 * 1. Dedupe check (prevent duplicate client syncs)
 * 2. Stream append (write client's offline updates)
 * 3. Dedupe marker set
 *
 * KEYS[1] = board:{boardId}:dedupe:{dedupeId}
 * KEYS[2] = board:{boardId}:stream
 * ARGV[1] = dedupeTTL (60 seconds)
 * ARGV[2] = maxStreamLength (1000)
 * ARGV[3] = boardId
 * ARGV[4] = userId
 * ARGV[5] = update (Base64)
 * ARGV[6] = timestamp
 *
 * Returns:
 * { ok: true, streamId }
 * { ok: false, code: "DUPLICATE" }
 */
const CLIENT_SYNC_SCRIPT = `
local dedupe_key = KEYS[1]
local stream_key = KEYS[2]
local dedupe_ttl = tonumber(ARGV[1])
local max_len = tonumber(ARGV[2])
local board_id = ARGV[3]
local user_id = ARGV[4]
local update = ARGV[5]
local timestamp_val = ARGV[6]

if redis.call('EXISTS', dedupe_key) == 1 then
  return cjson.encode({ok = false, code = 'DUPLICATE'})
end

redis.call('SETEX', dedupe_key, dedupe_ttl, '1')

local stream_id = redis.call(
  'XADD', stream_key, 'MAXLEN', '~', max_len, '*',
  'boardId', board_id,
  'userId', user_id,
  'update', update,
  'timestamp', timestamp_val
)

return cjson.encode({ok = true, streamId = stream_id})
`;

/**
 * Redis Snapshot Structure
 */
interface RedisSnapshot {
  snapshot: string; // Base64-encoded Y.Doc binary
  streamId: string; // Last stream ID merged into this snapshot
  version: number; // Monotonic counter (for debugging)
  updatedAt: number; // Timestamp (for debugging)
}

/**
 * Get Board Snapshot Handler (V5 - Redis-First)
 *
 * **Architecture:** Redis-first with S3 fallback
 *
 * Flow:
 * 1. Authorization: Verify user is collaborator/creator
 * 2. Try Redis snapshot:latest (fast path: <10ms)
 *    - If HIT: Use as base
 *    - If MISS: Load from S3, warm Redis cache
 * 3. Apply delta from stream (handle worker lag)
 *    - Worker updates Redis every 5s
 *    - Query handler applies any newer updates
 * 4. Compute diff using state vector (bandwidth optimization)
 * 5. Return diff + metadata
 *
 * **Performance:**
 * - Redis hit: <10ms (down from 100-200ms)
 * - Redis miss: ~100ms (S3 fallback)
 *
 * **Simplifications from V4:**
 * - ✅ No cold-start locking (Redis reads are instant + idempotent)
 * - ✅ No cache warming in handler (stream worker handles it)
 * - ✅ No version comparison (query handler is read-only)
 */
export const handler = async (
  input: GetBoardSnapshotInput,
  ctx: ServiceContext
): Promise<BoardSnapshot> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  const { boardId, clientSnapshot } = input;
  const startTime = Date.now();

  logger.info("📥 get-board-snapshot: Handler entry", { boardId, userId });

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
    });

    // 2. Load snapshot from Redis or S3
    let snapshotBinary!: Uint8Array; // Definitely assigned before use
    let snapshotStreamId!: string; // Definitely assigned before use
    let redisHit = false;

    const snapshotKey = WhiteboardKeys.SnapshotLatest(boardId);
    const cached = await ctx.redis.get(snapshotKey);

    if (cached) {
      // ✅ REDIS HIT - Fast path (<10ms)
      try {
        const parsed = JSON.parse(cached) as RedisSnapshot;
        const binary = Buffer.from(parsed.snapshot, "base64");

        // Validate binary is valid Y.Doc
        const testDoc = new Y.Doc({ guid: boardId }); // ✅ Deterministic GUID
        const validationResult = safeApplyUpdate(
          testDoc,
          binary,
          {
            context: "server:redis-snapshot-validation",
            boardId,
            throwOnError: true,
          },
          logger
        );

        if (!validationResult.success) {
          throw validationResult.error!;
        }

        testDoc.destroy();

        // Validation passed - use this snapshot
        snapshotBinary = binary;
        snapshotStreamId = parsed.streamId || "0-0";
        redisHit = true;

        logger.info("✅ Redis HIT - fast path", {
          boardId,
          streamId: snapshotStreamId,
          version: parsed.version,
        });
      } catch (parseError) {
        // Corrupted cache - fall through to S3
        logger.error("❌ Corrupted Redis cache - falling back to S3", {
          boardId,
          error: parseError,
        });

        // Delete corrupted cache
        await ctx.redis.del(snapshotKey);
        redisHit = false;
      }
    }

    if (!redisHit) {
      // ❌ REDIS MISS - S3 fallback (~100ms)
      logger.warn("❌ Redis MISS - loading from S3", { boardId });

      if (!board.s3Key) {
        // New board - return empty Y.Doc
        logger.info("ℹ️  New board - starting empty", { boardId });
        const emptyDoc = new Y.Doc();
        const emptySnapshot = Y.encodeStateAsUpdate(emptyDoc);
        emptyDoc.destroy();

        return {
          boardId,
          snapshot: Buffer.from(emptySnapshot).toString("base64"),
          lastStreamId: "0-0",
          snapshotTimestamp: null,
        };
      }

      try {
        // Download from S3 with timeout
        const s3Binary = await Promise.race([
          downloadSnapshot(board.s3Key),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("S3 timeout")), 10000)
          ),
        ]);

        snapshotBinary = s3Binary;
        snapshotStreamId = board.lastSnapshotStreamId || "0-0";

        logger.info("✅ S3 snapshot loaded", {
          boardId,
          size: s3Binary.length,
          streamId: snapshotStreamId,
        });

        // Warm Redis cache for next query
        await ctx.redis.setex(
          snapshotKey,
          WhiteboardTTLs.SNAPSHOT_LATEST,
          JSON.stringify({
            snapshot: Buffer.from(snapshotBinary).toString("base64"),
            streamId: snapshotStreamId,
            version: 0,
            updatedAt: Date.now(),
          } as RedisSnapshot)
        );

        logger.info("✅ Redis cache warmed", { boardId });
      } catch (s3Error) {
        logger.error("❌ S3 download failed", {
          boardId,
          s3Key: board.s3Key,
          error: s3Error,
        });

        throw new AppError("Failed to load board snapshot. Please try again.");
      }
    }

    // 3. Apply delta from stream (handle worker lag)
    // Worker updates Redis every 5s (debounced).
    // In those 5s, stream accumulates 0-50 updates.
    // Handler MUST merge these to return absolute latest state.
    const tempDoc = new Y.Doc({ guid: boardId }); // ✅ Deterministic GUID
    Y.applyUpdate(tempDoc, snapshotBinary);

    const streamKey = WhiteboardKeys.BoardStream(boardId);
    const newerUpdates = (await ctx.redis.xrange(
      streamKey,
      `(${snapshotStreamId}`, // Exclusive start (don't re-apply base)
      "+", // Up to latest
      "COUNT",
      5000
    )) as Array<[string, string[]]>;

    let lastStreamId = snapshotStreamId;
    for (const [id, fields] of newerUpdates) {
      // Parse Redis stream fields: ["boardId", "abc", "update", "base64...", ...]
      const data: Record<string, string> = {};
      for (let i = 0; i < fields.length; i += 2) {
        data[fields[i]] = fields[i + 1];
      }

      const updateB64 = data.update;
      if (updateB64) {
        const update = Buffer.from(updateB64, "base64");
        const deltaResult = safeApplyUpdate(
          tempDoc,
          update,
          {
            context: "server:stream-delta",
            boardId,
            streamId: id,
            throwOnError: false, // Non-fatal, continue processing
          },
          logger
        );

        if (deltaResult.success) {
          lastStreamId = id;
        }
        // Note: Failed updates are logged but don't block processing
      }
    }

    if (newerUpdates.length > 0) {
      logger.info("✅ Applied delta updates (worker lag)", {
        boardId,
        baseStreamId: snapshotStreamId,
        lastStreamId,
        deltaCount: newerUpdates.length,
      });
    }

    // 3. BIDIRECTIONAL SYNC: Handle client's offline updates
    // If client sends their snapshot, they may have updates server doesn't have (offline edits)
    // We need to:
    // 1. Compute client→server diff (what server is missing)
    // 2. Apply to server's Y.Doc
    // 3. Write to stream
    // 4. Broadcast to other subscribed users
    let clientUploadedUpdates = false;

    if (input.clientSnapshot) {
      try {
        logger.info("📤 Client sent snapshot for bidirectional sync", {
          boardId,
          userId,
          clientSnapshotSize: input.clientSnapshot.length,
        });

        // Create client's Y.Doc from their snapshot
        const clientDoc = new Y.Doc({ guid: boardId }); // ✅ Deterministic GUID
        const clientBinary = Buffer.from(input.clientSnapshot, "base64");
        Y.applyUpdate(clientDoc, clientBinary);

        // Compute what server is missing (client has but server doesn't)
        const serverStateVector = Y.encodeStateVector(tempDoc);
        const clientToServerDiff = Y.encodeStateAsUpdate(
          clientDoc,
          serverStateVector
        );

        // If client has updates server doesn't have
        if (clientToServerDiff.length > 0) {
          logger.info("📥 Client has updates server is missing", {
            boardId,
            userId,
            diffSize: clientToServerDiff.length,
          });

          // Apply client's offline updates with validation
          const applyResult = safeApplyUpdate(
            tempDoc,
            clientToServerDiff,
            {
              context: "server:client-offline-updates",
              boardId,
              throwOnError: true, // Critical for bidirectional sync
            },
            logger
          );

          if (!applyResult.success) {
            logger.error("❌ CRITICAL: Failed to apply client updates", {
              boardId,
              userId,
            });
            throw applyResult.error!;
          }

          // Write to Redis stream using Lua script (atomic deduplication + append)
          const streamKey = WhiteboardKeys.BoardStream(boardId);
          const dedupeId = `client-sync-${userId}-${Date.now()}`;
          const dedupeKey = WhiteboardKeys.DedupeKey(boardId, dedupeId);
          const timestamp = Date.now();

          const luaResult = (await ctx.redis.eval(
            CLIENT_SYNC_SCRIPT,
            2, // Number of KEYS
            dedupeKey,
            streamKey,
            WhiteboardTTLs.DEDUPE_KEY.toString(),
            "1000", // maxStreamLength
            boardId,
            userId,
            Buffer.from(clientToServerDiff).toString("base64"),
            timestamp.toString()
          )) as string;

          const parsedResult = JSON.parse(luaResult) as {
            ok: boolean;
            streamId?: string;
            code?: string;
          };

          if (!parsedResult.ok || parsedResult.code === "DUPLICATE") {
            logger.warn("⚠️  Duplicate client sync detected", {
              boardId,
              userId,
            });
            clientUploadedUpdates = false;
          } else {
            logger.info("✅ Client updates written to stream", {
              boardId,
              userId,
              streamId: parsedResult.streamId,
            });

            // Broadcast to other subscribed users
            const channel = WhiteboardKeys.BoardEvents(boardId);

            const boardUpdateFrame = createSuccessFrame(
              undefined,
              "whiteboard:board-update",
              {
                boardId,
                streamId: parsedResult.streamId!,
                update: Buffer.from(clientToServerDiff).toString("base64"),
                authorId: userId,
                sequence: 0,
                timestamp: new Date(timestamp).toISOString(),
              }
            );

            const pubSubMessage = JSON.stringify({
              message: boardUpdateFrame,
              originSocketId: null, // Broadcast to everyone (including sender on other devices)
            });

            await ctx.redis.publish(channel, pubSubMessage);

            logger.info("📡 Broadcast client's offline updates", {
              boardId,
              userId,
              streamId: parsedResult.streamId,
              diffSize: clientToServerDiff.length,
            });

            clientUploadedUpdates = true;
          }
        } else {
          logger.info("ℹ️  Client snapshot in sync with server", {
            boardId,
            userId,
          });
        }

        clientDoc.destroy();
      } catch (error) {
        logger.error("❌ Failed to process client snapshot", {
          boardId,
          userId,
          error,
        });
        // Non-fatal: Continue with normal snapshot response
      }
    }

    // 4. Compute server→client diff
    // Derive state vector from client's snapshot if provided
    let clientStateVector: Uint8Array | undefined;
    if (input.clientSnapshot) {
      // We already have clientDoc created above, derive its state vector
      // But if bidirectional sync didn't run (no clientSnapshot), we need full state
      try {
        const clientDoc = new Y.Doc({ guid: boardId }); // ✅ Deterministic GUID
        const vectorResult = safeApplyUpdate(
          clientDoc,
          Buffer.from(input.clientSnapshot, "base64"),
          {
            context: "server:state-vector-derivation",
            boardId,
            throwOnError: false, // Graceful fallback
          },
          logger
        );

        if (vectorResult.success) {
          clientStateVector = Y.encodeStateVector(clientDoc);
        } else {
          clientStateVector = undefined;
        }
        clientDoc.destroy();
      } catch {
        // Invalid client snapshot - return full state
        clientStateVector = undefined;
      }
    }

    const diff = Y.encodeStateAsUpdate(tempDoc, clientStateVector);
    const snapshotB64 = Buffer.from(diff).toString("base64");

    // Cleanup
    tempDoc.destroy();

    // 5. Log metrics
    const latencyMs = Date.now() - startTime;
    logger.info("📊 Query metrics", {
      boardId,
      redisHit,
      deltaCount: newerUpdates.length,
      latencyMs,
      diffSize: diff.length,
    });

    // 6. Return result
    return {
      boardId: board.id,
      snapshot: snapshotB64,
      lastStreamId,
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
