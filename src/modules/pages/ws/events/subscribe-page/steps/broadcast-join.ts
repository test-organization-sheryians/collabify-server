/**
 * Step 7 — Broadcast Join
 *
 * Fetches the joining user's profile and publishes a page:user-joined event
 * to all other subscribers. Only called when isNew === 1 (first join, not a
 * reconnect or second tab) to prevent notification spam.
 *
 * FIX vs original: PUBLISH payload is wrapped in JSON.stringify({ message, originSocketId })
 * so wsRegistry.dispatch() can correctly exclude the sender's socket.
 * The original code published a raw frame string → originSocketId was discarded
 * → user saw their own join broadcast (self-echo bug).
 */

import { createSuccessFrame } from "@/infra/ws/types";
import { createLogger } from "@/shared/lib/logger";
import { PageKeys } from "../../../../infra/page-keys";
import type { PrismaClient } from "@prisma/client";
import type { Redis } from "ioredis";

const logger = createLogger("pages:ws:subscribe-page:broadcast-join");

export async function broadcastJoin(
  pageId: string,
  userId: string,
  socketId: string,
  timestamp: number,
  redis: Redis,
  db: PrismaClient
): Promise<void> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, avatarUrl: true },
    });

    if (!user) return;

    const frame = createSuccessFrame(undefined, "page:user-joined", {
      pageId,
      userId: user.id,
      fullName: user.fullName ?? "Unknown",
      avatarUrl: user.avatarUrl ?? null,
      timestamp,
    });

    // IMPORTANT: wrap in { message, originSocketId } so wsRegistry.dispatch()
    // suppresses delivery to the joining user's own socket.
    await redis.publish(
      PageKeys.PageEvents(pageId),
      JSON.stringify({ message: frame, originSocketId: socketId })
    );

    logger.info("User-joined broadcast sent", { pageId, userId });
  } catch (err) {
    // Best-effort — user-joined is cosmetic, not critical
    logger.error("Failed to broadcast user-joined", { pageId, userId, err });
  }
}
