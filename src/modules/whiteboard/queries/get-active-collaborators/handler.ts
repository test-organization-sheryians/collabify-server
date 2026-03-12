import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { GetActiveCollaboratorsInput, ActiveCollaborator } from "./types";

/**
 * getActiveCollaborators — Query Handler (V4 - Production Hardened)
 *
 * Fetches real-time presence data from Redis ZSET.
 *
 * Auth:
 *   - assertBoardCollaborator — cache-backed membership gate
 * (No permissions.assert — presence is non-critical, always accessible to collaborators)
 */
export const handler = async (
  input: GetActiveCollaboratorsInput,
  ctx: ServiceContext
): Promise<ActiveCollaborator[]> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");
  if (!ctx.authGate) throw AppError.unauthorized();

  const { boardId } = input;

  try {
    // Step 1 — collaborator gate (cache-backed)
    await ctx.authGate.assertBoardCollaborator(boardId);

    // Step 2 — calculate 5-minute cutoff for active connections
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    // Step 3 — get active connections from Redis ZSET
    const activeConnectionsRaw = await ctx.redis.zrangebyscore(
      `board:${boardId}:subscribers`,
      fiveMinutesAgo,
      "+inf",
      "WITHSCORES"
    );

    const connections: Array<{ id: string; lastSeen: number }> = [];
    for (let i = 0; i < activeConnectionsRaw.length; i += 2) {
      connections.push({
        id: activeConnectionsRaw[i] as string,
        lastSeen: parseInt(activeConnectionsRaw[i + 1] as string, 10),
      });
    }

    if (connections.length === 0) return [];

    // Step 4 — batch fetch metadata via Redis pipeline
    const pipeline = ctx.redis.pipeline();
    connections.forEach((conn) => {
      pipeline.hgetall(`board:${boardId}:connection:${conn.id}`);
    });

    const metadataResults = await pipeline.exec();
    if (!Array.isArray(metadataResults)) return [];

    // Step 5 — build deduplicated response
    const userMap = new Map<string, ActiveCollaborator>();

    for (let i = 0; i < connections.length; i++) {
      const [err, metadata] = metadataResults[i];
      if (err) continue;

      const connMetadata = metadata as Record<string, string> | null;
      if (!connMetadata || !connMetadata.userId) continue;

      const conn = connections[i];
      const joinedAtMs = Number(connMetadata.joinedAt);
      if (!Number.isFinite(joinedAtMs)) continue;

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

      const existing = userMap.get(connMetadata.userId);
      if (!existing || conn.lastSeen > existing.lastSeenAt.getTime()) {
        userMap.set(connMetadata.userId, collaborator);
      }
    }

    return Array.from(userMap.values());
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    // Graceful degradation: presence is non-critical
    return [];
  }
};
