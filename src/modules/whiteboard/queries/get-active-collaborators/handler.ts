import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { GetActiveCollaboratorsInput, ActiveCollaborator } from "./types";

/**
 * Get Active Collaborators Handler (V4 - Production Hardened)
 *
 * Fetches real-time presence data for users currently viewing/editing the board.
 * This powers the "who's online" feature and cursor tracking.
 *
 * Architecture:
 * - Gateway writes to Redis on subscribe/disconnect
 * - This query reads from Redis ZSET for presence
 * - 5-minute activity filter (stale connections ignored)
 * - Graceful degradation if Redis unavailable
 * - Deduplicates by userId (handles multi-tab/device)
 *
 * Data source: Redis ZSET `board:{id}:subscribers`
 * - Member: connectionId
 * - Score: Unix timestamp of last activity (ms)
 * - Metadata: Redis HASH `board:{id}:connection:{connectionId}`
 */
export const handler = async (
  input: GetActiveCollaboratorsInput,
  ctx: ServiceContext
): Promise<ActiveCollaborator[]> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  const { boardId } = input;

  try {
    // 1. Verify user has access to the board
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
      select: { id: true },
    });

    if (!board) {
      throw AppError.forbidden(
        "Whiteboard not found or you do not have access"
      );
    }

    // 2. Calculate 5-minute cutoff for active connections
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    // 3. Get active connections from Redis ZSET (score = lastActivityTimestamp)
    const activeConnectionsRaw = await ctx.redis.zrangebyscore(
      `board:${boardId}:subscribers`,
      fiveMinutesAgo,
      "+inf",
      "WITHSCORES"
    );

    // Parse: ["connId1", "timestamp1", "connId2", "timestamp2", ...]
    const connections: Array<{ id: string; lastSeen: number }> = [];
    for (let i = 0; i < activeConnectionsRaw.length; i += 2) {
      connections.push({
        id: activeConnectionsRaw[i] as string,
        lastSeen: parseInt(activeConnectionsRaw[i + 1] as string, 10),
      });
    }

    // Empty board - no active collaborators
    if (connections.length === 0) {
      return [];
    }

    // 4. Batch fetch metadata using Redis pipeline (single round-trip)
    const pipeline = ctx.redis.pipeline();
    connections.forEach((conn) => {
      pipeline.hgetall(`board:${boardId}:connection:${conn.id}`);
    });

    const metadataResults = await pipeline.exec();

    if (!Array.isArray(metadataResults)) {
      // Pipeline failed - graceful degradation (return empty)
      return [];
    }

    // 5. Build response array with user deduplication
    // Use Map to deduplicate by userId (handles multi-tab/device)
    const userMap = new Map<string, ActiveCollaborator>();

    for (let i = 0; i < connections.length; i++) {
      const [err, metadata] = metadataResults[i];

      if (err) {
        // Skip this connection if metadata fetch failed
        continue;
      }

      const connMetadata = metadata as Record<string, string> | null;

      if (!connMetadata || !connMetadata.userId) {
        // Skip if metadata missing (race condition during cleanup)
        continue;
      }

      const conn = connections[i];

      // Validate timestamps to prevent Invalid Date
      const joinedAtMs = Number(connMetadata.joinedAt);
      if (!Number.isFinite(joinedAtMs)) {
        // Skip connections with corrupted timestamps
        continue;
      }

      // Parse cursor position - handle (0,0) correctly
      let cursorPosition: { x: number; y: number } | null = null;
      if (
        typeof connMetadata.cursorX === "string" &&
        typeof connMetadata.cursorY === "string"
      ) {
        const cursorX = parseFloat(connMetadata.cursorX);
        const cursorY = parseFloat(connMetadata.cursorY);

        if (Number.isFinite(cursorX) && Number.isFinite(cursorY)) {
          cursorPosition = { x: cursorX, y: cursorY };
        }
      }

      const collaborator: ActiveCollaborator = {
        userId: connMetadata.userId,
        connectionId: conn.id,
        joinedAt: new Date(joinedAtMs),
        lastSeenAt: new Date(conn.lastSeen),
        cursorPosition,
      };

      // Deduplicate: Keep most recent connection per user
      const existing = userMap.get(connMetadata.userId);
      if (!existing || conn.lastSeen > existing.lastSeenAt.getTime()) {
        userMap.set(connMetadata.userId, collaborator);
      }
    }

    return Array.from(userMap.values());
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;

    // Graceful degradation: Return empty array instead of crashing
    // Presence is non-critical feature, don't fail the query
    return [];
  }
};
