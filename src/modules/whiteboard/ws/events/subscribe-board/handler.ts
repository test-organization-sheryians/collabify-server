import { WSHandlerContext } from "@/infra/ws/types";
import { ChatWebSocket, createSuccessFrame } from "@/infra/ws/types";
import { SubscribeBoardInput } from "./schema";
import { wsRegistry } from "@/infra/ws/subscription-registry";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("whiteboard:ws:subscribe");
import { WhiteboardKeys } from "@/modules/whiteboard/infra/whiteboard-keys";
import { appRedis } from "@/infra/redis";
import {
  executePresenceTracking,
  executeBoardActivation,
} from "@/modules/whiteboard/infra/lua-scripts";

/**
 * Subscribe Board Handler (V5 Replay Gap Architecture)
 *
 * DESIGN PHILOSOPHY:
 * - Gateway is stateless (I-5): No S3, no Y.Doc, no state merging
 * - Separation of concerns: GraphQL owns state fetching, WebSocket owns real-time
 * - Client must fetch snapshot via GraphQL BEFORE subscribing
 * - This handler manages: replay gap + presence tracking + pub/sub subscriptions
 *
 * V5 REPLAY GAP FEATURE:
 * - Client sends lastStreamId from snapshot response
 * - Handler calculates gap: XRANGE(lastStreamId, latest)
 * - Sends missing updates via whiteboard:replay-updates event
 * - Eliminates state divergence from snapshot→subscribe window
 *
 * PERFORMANCE OPTIMIZATION:
 * - Uses Lua scripts for atomic Redis operations (5 RTTs → 1 RTT)
 * - Eliminates race conditions in presence tracking
 */
export const subscribeBoardHandler = async (
  ctx: WSHandlerContext,
  socket: ChatWebSocket,
  input: SubscribeBoardInput
) => {
  const { boardId } = input;
  const { userId, socketId } = socket.data;

  // ==========================================
  // Authorization: Verify Collaborator Status
  // ==========================================

  const collaborator = await ctx.db.whiteboardCollaborator.findFirst({
    where: {
      whiteboardId: boardId,
      userId,
    },
    select: {
      id: true,
      whiteboard: {
        select: {
          id: true,
          deletedAt: true,
          isArchived: true,
          isLocked: true,
        },
      },
    },
  });

  if (!collaborator) {
    socket.send(
      JSON.stringify({
        type: "whiteboard:subscribe-error",
        error: {
          code: "FORBIDDEN",
          message: "You are not a collaborator on this board",
        },
      })
    );
    return;
  }

  const board = collaborator.whiteboard;

  if (board.deletedAt) {
    socket.send(
      JSON.stringify({
        type: "whiteboard:subscribe-error",
        error: {
          code: "NOT_FOUND",
          message: "Board has been deleted",
        },
      })
    );
    return;
  }

  // DESIGN: Allow archived board subscriptions (read-only enforced in board-update handler)
  // Rationale: Users should be able to view archived boards, enforcement happens at write time

  // ==========================================
  // Presence Tracking: Atomic Lua Script
  // ==========================================
  // PERFORMANCE: 5 Redis calls → 1 Redis call (Lua script)
  // CORRECTNESS: Eliminates race conditions between NX check and timestamp update
  //
  // Old approach (5 RTTs):
  //   1. ZADD NX
  //   2. Check result
  //   3. ZADD (conditional)
  //   4. EXPIRE
  //   5. ZCARD
  //
  // New approach (1 RTT):
  //   - Lua script executes all operations atomically

  const timestamp = Date.now();

  // TODO: Get script SHA from global cache (loaded at startup)
  // For now, execute inline (will optimize with script loading in production)
  const presenceScript = `
    local key = KEYS[1]
    local timestamp = tonumber(ARGV[1])
    local userId = ARGV[2]
    local ttl = tonumber(ARGV[3])
    
    local isFirstJoin = redis.call('ZADD', key, 'NX', timestamp, userId)
    if isFirstJoin == 0 then
      redis.call('ZADD', key, timestamp, userId)
    end
    redis.call('EXPIRE', key, ttl)
    local subscriberCount = redis.call('ZCARD', key)
    
    return {isFirstJoin, subscriberCount}
  `;

  const [isFirstJoin, subscriberCount] = (await appRedis.eval(
    presenceScript,
    1,
    WhiteboardKeys.BoardSubscribers(boardId),
    timestamp.toString(),
    userId,
    "86400"
  )) as [number, number];

  logger.info("User Presence Updated (Lua)", {
    userId,
    boardId,
    subscriberCount,
    isFirstJoin: isFirstJoin === 1,
  });

  // ==========================================
  // Board Activation: Atomic Lua Script
  // ==========================================
  // PERFORMANCE: 2 Redis calls → 1 Redis call (Lua script)
  //
  // Old approach (2 RTTs):
  //   1. ZADD sys:boards:active
  //   2. INCR sys:boards:epoch
  //
  // New approach (1 RTT):
  //   - Lua script executes both atomically

  if (subscriberCount === 1) {
    const activationScript = `
      local activeKey = KEYS[1]
      local epochKey = KEYS[2]
      local timestamp = tonumber(ARGV[1])
      local boardId = ARGV[2]
      
      redis.call('ZADD', activeKey, timestamp, boardId)
      local newEpoch = redis.call('INCR', epochKey)
      
      return newEpoch
    `;

    const newEpoch = (await appRedis.eval(
      activationScript,
      2,
      "sys:boards:active",
      "sys:boards:epoch",
      timestamp.toString(),
      boardId
    )) as number;

    logger.info("Board Activated (Lua)", {
      boardId,
      newEpoch,
    });
  }

  const topic = WhiteboardKeys.BoardEvents(boardId);
  await wsRegistry.subscribe(socketId, topic);

  logger.info("Socket Subscribed to Board Events", {
    userId,
    boardId,
    socketId,
    topic,
  });

  // ==========================================
  // Replay Gap: Send Missing Updates
  // ==========================================
  // V5 FEATURE: Close the gap between snapshot fetch and subscribe
  // - Client sends lastStreamId from snapshot response
  // - Calculate updates from lastStreamId to latest
  // - Send each missing update as individual board-update events
  // - Reuses existing board-update handler (no new payload types!)

  if (input.lastStreamId) {
    const streamKey = WhiteboardKeys.BoardStream(boardId);

    try {
      // Get updates from lastStreamId (exclusive) to latest (inclusive)
      const missingUpdates = (await appRedis.xrange(
        streamKey,
        `(${input.lastStreamId}`, // Exclusive: start AFTER lastStreamId
        "+", // Inclusive: up to latest
        "COUNT",
        5000 // Limit: prevent OOM on large gaps
      )) as Array<[string, string[]]>;

      if (missingUpdates.length > 0) {
        logger.info("✅ Replaying gap updates", {
          boardId,
          userId,
          gapSize: missingUpdates.length,
          from: input.lastStreamId,
          to: missingUpdates[missingUpdates.length - 1][0],
        });

        // Send each update as individual board-update event (to THIS CLIENT ONLY)
        for (const [id, fields] of missingUpdates) {
          const data: Record<string, string> = {};
          for (let i = 0; i < fields.length; i += 2) {
            data[fields[i]] = fields[i + 1];
          }

          // Send as regular board-update (reuses existing handler!)
          socket.send(
            createSuccessFrame(undefined, "whiteboard:board-update", {
              boardId: data.boardId,
              streamId: id,
              update: data.update, // Base64 Y.js update
              authorId: data.userId,
              sequence: 0, // Not used
              timestamp: new Date(
                parseInt(data.timestamp || "0", 10)
              ).toISOString(),
            })
          );
        }

        logger.info("Replay gap complete", {
          boardId,
          userId,
          updatesReplayed: missingUpdates.length,
        });
      } else {
        // No gap - client is already up to date
        logger.debug("No replay gap - client up to date", {
          boardId,
          userId,
          lastStreamId: input.lastStreamId,
        });
      }
    } catch (replayError) {
      logger.error("❌ Replay gap failed (non-fatal)", {
        boardId,
        userId,
        lastStreamId: input.lastStreamId,
        error: replayError,
      });

      // Non-fatal: Continue with subscribe (client will use state vector sync)
      // Worst case: small gap remains, state vector sync handles it
    }
  } else {
    logger.debug("No lastStreamId provided (old client or first load)", {
      boardId,
      userId,
    });
  }

  // ==========================================
  // Fetch Active Collaborators (Batch Query)
  // ==========================================
  // DESIGN: Direct db.user.findMany (no DataLoader)
  // Rationale: WebSocket handlers are per-connection, DataLoaders are per-request (GraphQL)
  // Single batch query is sufficient, no N+1 risk

  const activeCollaboratorIds = await appRedis.zrange(
    WhiteboardKeys.BoardSubscribers(boardId),
    0,
    -1
  );

  const users = await ctx.db.user.findMany({
    where: {
      id: { in: activeCollaboratorIds },
      deletedAt: null,
    },
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
    },
  });

  const collaborators = users.map((user) => ({
    userId: user.id,
    fullName: user.fullName || "Unknown",
    avatarUrl: user.avatarUrl ?? "",
  }));

  // ==========================================
  // Send Success Response
  // ==========================================
  // DESIGN: Minimal payload (<1KB)
  // - No snapshot data (GraphQL responsibility)
  // - Only metadata: collaborators, lock/archive status

  socket.send(
    createSuccessFrame(undefined, "whiteboard:subscribe-success", {
      boardId,
      collaborators,
      isLocked: board.isLocked,
      isArchived: board.isArchived, // Client shows read-only banner
    })
  );

  logger.info("Subscribe Success Sent", {
    userId,
    boardId,
    collaboratorCount: collaborators.length,
  });

  // ==========================================
  // Broadcast User Joined (Conditional)
  // ==========================================
  // DESIGN: Only broadcast on first join (isFirstJoin = true)
  // Prevents notification spam when user:
  // - Refreshes page
  // - Reconnects after network drop
  // - Opens multiple tabs (each gets separate socketId but same userId)

  if (isFirstJoin === 1) {
    const user = await ctx.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      logger.warn("User Not Found for Join Broadcast", {
        userId,
        boardId,
      });
      return; // Graceful degradation: skip broadcast if user deleted mid-request
    }

    // Broadcast user-joined event using proper envelope format
    const userJoinedFrame = createSuccessFrame(
      undefined, // No request ID for broadcasts
      "whiteboard:user-joined",
      {
        boardId,
        userId: user.id,
        fullName: user.fullName || "Unknown",
        avatarUrl: user.avatarUrl ?? "",
        timestamp: Date.now(),
      }
    );

    await appRedis.publish(
      WhiteboardKeys.BoardEvents(boardId),
      userJoinedFrame
    );

    logger.info("User Joined Event Broadcast", {
      userId,
      boardId,
      subscriberCount,
    });
  } else {
    logger.info("User Reconnected (No Join Broadcast)", {
      userId,
      boardId,
    });
  }
};
