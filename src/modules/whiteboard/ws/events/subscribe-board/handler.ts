import { WSHandlerContext } from "@/infra/ws/types";
import {
  ChatWebSocket,
  createSuccessFrame,
  createErrorFrame,
} from "@/infra/ws/types";
import { SubscribeBoardInput } from "./schema";
import { logger } from "@/shared/logger";

/**
 * Subscribe Board Handler
 *
 * User joins a whiteboard session and receives initial state
 */
export const subscribeBoardHandler = async (
  ctx: WSHandlerContext,
  socket: ChatWebSocket,
  input: SubscribeBoardInput
) => {
  const { boardId, stateVector } = input;
  const { userId } = socket.data;

  logger.info({
    msg: "Processing Subscribe Board",
    userId,
    boardId,
  });

  try {
    // TODO: V4 Architecture - Subscribe Board
    // ============================================
    //
    // STEP 1: Authorization Check
    // ---------------------------
    // - Validate user is a collaborator on this board
    // - Query: WhiteboardCollaborator.findFirst({ where: { userId, whiteboardId: boardId } })
    // - If not found → send error "UNAUTHORIZED" and return
    // - Also check board.deletedAt is null (not soft-deleted)
    //
    // STEP 2: Add User to Subscribers (Redis)
    // ---------------------------------------
    // - Add user to Redis ZSET: board:{boardId}:subscribers
    // - Use ZADD with current timestamp as score
    // - Command: ZADD board:{boardId}:subscribers ${Date.now()} ${userId}
    // - Set TTL on ZSET: EXPIRE board:{boardId}:subscribers 86400 (24 hours)
    //
    // STEP 3: Fetch Initial State
    // ---------------------------
    // 3a. Fetch Last S3 Snapshot:
    //     - Get board.lastSnapshotStreamId and board.s3Key from Prisma
    //     - Download snapshot from S3 using s3Client.downloadSnapshot(s3Key)
    //     - Decode Y.Doc binary from S3
    //
    // 3b. Fetch Redis Stream Updates:
    //     - Read from Redis stream: board:{boardId}:stream
    //     - If lastSnapshotStreamId exists:
    //       - XRANGE board:{boardId}:stream ${lastSnapshotStreamId} +
    //     - If no snapshot (new board):
    //       - XRANGE board:{boardId}:stream - +
    //
    // 3c. Merge Updates:
    //     - Use domain/board-state/merge-updates.ts
    //     - Apply each stream update to base Y.Doc
    //     - Result: Final Y.Doc state as Uint8Array
    //
    // 3d. Optional: Compute State Vector Diff
    //     - If client sent stateVector:
    //       - Use domain/board-state/state-vector-diff.ts
    //       - Compute minimal diff between server state and client state
    //       - Only send the diff (optimization)
    //
    // STEP 4: Fetch Active Collaborators
    // ----------------------------------
    // - ZRANGE board:{boardId}:subscribers 0 -1 WITHSCORES
    // - Get list of active userIds
    // - Batch fetch user info using DataLoader: ctx.dataloaders.whiteboard.userById
    // - Format as: [{ userId, fullName, avatarUrl }]
    //
    // STEP 5: Send Initial State to Client
    // ------------------------------------
    // - Send event: "whiteboard:board-init"
    // - Payload:
    //   {
    //     boardId,
    //     snapshot: base64(finalYDocBinary),
    //     streamId: currentStreamId, // Latest stream ID
    //     elementCount: board.elementCount,
    //     collaborators: [...activeCollaborators]
    //   }
    //
    // STEP 6: Broadcast User Joined
    // -----------------------------
    // - Broadcast to all OTHER subscribers (not sender):
    //   - Event: "whiteboard:user-joined"
    //   - Payload: { boardId, userId, fullName, avatarUrl, timestamp }
    // - Use Redis Pub/Sub channel: board:{boardId}:events
    //
    // STEP 7: Update Presence Tracking
    // --------------------------------
    // - Set Redis Hash: board:{boardId}:user:{userId}:state
    // - Value: { isOnline: true, lastSeen: timestamp }
    // - TTL: 60 seconds (auto-refresh with heartbeat)
    //
    // ERROR HANDLING:
    // - Board not found → "BOARD_NOT_FOUND"
    // - User not collaborator → "UNAUTHORIZED"
    // - S3 download failure → "SNAPSHOT_LOAD_FAILED"
    // - Redis stream failure → retry 3x, then fallback to S3 only
    //
    // ============================================

    throw new Error("TODO: Implement subscribe-board handler");
  } catch (err: unknown) {
    logger.error({ err, boardId }, "Failed to subscribe to board");

    socket.send(
      createErrorFrame(
        undefined,
        "whiteboard:subscribe-board",
        "INTERNAL_ERROR",
        "Failed to subscribe to board"
      )
    );
  }
};
