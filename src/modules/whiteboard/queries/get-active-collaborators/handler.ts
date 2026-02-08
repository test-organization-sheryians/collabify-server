import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { GetActiveCollaboratorsInput, ActiveCollaborator } from "./types";

/**
 * Get Active Collaborators Handler
 *
 * Fetches real-time presence data for users currently viewing/editing the board.
 * This powers the "who's online" feature and cursor tracking.
 *
 * Data source: Redis ZSET `board:{id}:subscribers`
 * - Member: connectionId
 * - Score: Unix timestamp of last activity
 * - Metadata: userId, cursor position (stored in Redis hash)
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

    // TODO V4-7: Implement Redis presence tracking
    // When implementing, use this pattern:
    //
    // const connections = await ctx.redis.getActiveConnections(board.id);
    //
    // Under the hood, this queries:
    //
    // 1. Get active connections (last 5 minutes):
    //    const now = Date.now();
    //    const fiveMinutesAgo = now - 5 * 60 * 1000;
    //
    //    const activeConnectionIds = await redis.zrangebyscore(
    //      `board:${board.id}:subscribers`,
    //      fiveMinutesAgo,
    //      "+inf"
    //    );
    //
    // 2. For each connection, fetch metadata:
    //    const metadata = await redis.hgetall(
    //      `board:${board.id}:connection:${connectionId}`
    //    );
    //
    // 3. Parse metadata:
    //    {
    //      userId: "cly123",
    //      joinedAt: "1702345670000",
    //      cursorX: "250.5",
    //      cursorY: "180.2"
    //    }
    //
    // 4. Build result:
    //    return connections.map(conn => ({
    //      userId: conn.userId,
    //      connectionId: conn.id,
    //      joinedAt: new Date(conn.joinedAt),
    //      lastSeenAt: new Date(conn.lastSeenAt),
    //      cursorPosition: conn.cursorX && conn.cursorY
    //        ? { x: parseFloat(conn.cursorX), y: parseFloat(conn.cursorY) }
    //        : null,
    //    }));

    // TEMPORARY: Return empty array until Redis is implemented
    return [];
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to fetch active collaborators");
  }
};
