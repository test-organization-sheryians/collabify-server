import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { GetBoardSnapshotInput, BoardSnapshot } from "./types";

/**
 * Get Board Snapshot Handler
 *
 * CRITICAL: This query is used when a user joins a whiteboard via WebSocket.
 * It fetches the latest S3 snapshot and applies any Redis stream updates since that snapshot.
 *
 * Flow:
 * 1. Authorization: Verify user is collaborator or creator
 * 2. Fetch board metadata (s3Key, lastSnapshotStreamId)
 * 3. Download S3 snapshot (binary Y.Doc state)
 * 4. Fetch Redis stream updates since lastSnapshotStreamId
 * 5. Apply updates to Y.Doc
 * 6. Encode final state as base64
 * 7. Return snapshot + metadata
 */
export const handler = async (
  input: GetBoardSnapshotInput,
  ctx: ServiceContext
): Promise<BoardSnapshot> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  const { boardId } = input;

  try {
    // 1. Get board and verify access
    const board = await ctx.db.whiteboard.findFirst({
      where: {
        id: boardId,
        OR: [
          { createdBy: userId },
          {
            collaborators: {
              some: { userId },
            },
          },
        ],
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
      throw AppError.forbidden(
        "Whiteboard not found or you do not have access"
      );
    }

    // TODO V4-3: Download snapshot from S3
    // When implementing, use this pattern:
    //
    // const snapshot = await ctx.s3.downloadLatestSnapshot(board.id);
    // if (!snapshot) {
    //   throw AppError.notFound("Board snapshot not found");
    // }
    //
    // S3 returns:
    // {
    //   binary: Uint8Array,          // Y.Doc state
    //   streamId: "1702345678901-0", // Last stream ID in snapshot
    //   timestamp: 1702345678         // Snapshot creation time
    // }

    // TODO V4-4: Read stream updates since snapshot
    // When implementing, use this pattern:
    //
    // const streamUpdates = await ctx.redis.readUpdates(
    //   board.id,
    //   snapshot.streamId  // Start reading from snapshot's streamId
    // );
    //
    // Returns array of updates:
    // [
    //   {
    //     streamId: "1702345678902-0",
    //     update: Uint8Array,
    //     userId: "cly123",
    //     timestamp: 1702345678902
    //   },
    //   ...
    // ]

    // TODO V4-5: Merge S3 snapshot + stream delta
    // When implementing, use this pattern:
    //
    // const Y = await import("yjs");
    // const ydoc = new Y.Doc();
    //
    // // Step 1: Apply S3 snapshot (base state)
    // Y.applyUpdate(ydoc, snapshot.binary);
    //
    // // Step 2: Apply each incremental update from stream
    // for (const update of streamUpdates) {
    //   Y.applyUpdate(ydoc, update.update);
    // }
    //
    // This gives you the complete, up-to-date Y.Doc state

    // TODO V4-6: Encode final state as base64
    // When implementing, use this pattern:
    //
    // const finalState = Y.encodeStateAsUpdate(ydoc);
    // const base64Snapshot = Buffer.from(finalState).toString("base64");
    //
    // const lastStreamId = streamUpdates.length > 0
    //   ? streamUpdates[streamUpdates.length - 1].streamId
    //   : snapshot.streamId;
    //
    // return {
    //   boardId: board.id,
    //   snapshot: base64Snapshot,
    //   lastStreamId,
    //   snapshotTimestamp: new Date(snapshot.timestamp),
    // };

    // TEMPORARY: Return empty snapshot until S3/Redis is implemented
    const emptyYDoc = await (async () => {
      const Y = await import("yjs");
      const doc = new Y.Doc();
      return Y.encodeStateAsUpdate(doc);
    })();

    const base64Snapshot = Buffer.from(emptyYDoc).toString("base64");

    return {
      boardId: board.id,
      snapshot: base64Snapshot,
      lastStreamId: board.lastSnapshotStreamId,
      snapshotTimestamp: board.lastSnapshotAt,
    };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to fetch board snapshot");
  }
};
