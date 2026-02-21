/**
 * Step 5 — Fetch Collaborators
 *
 * Gets the active collaborator list to include in subscribe-success.
 * Two-step: ZRANGE active userIds from Redis → batch DB lookup for display names.
 *
 * WHY BATCH (not DataLoader): WS handlers don't have the GraphQL DataLoader
 * context. One ZRANGE + one findMany is the right pattern here.
 */

import { createLogger } from "@/shared/lib/logger";
import { PageKeys } from "../../../../infra/page-keys";
import type { PrismaClient } from "@prisma/client";
import type { Redis } from "ioredis";

const logger = createLogger("pages:ws:subscribe-page:fetch-collaborators");

export interface CollaboratorInfo {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
}

export async function fetchCollaborators(
  pageId: string,
  redis: Redis,
  db: PrismaClient
): Promise<CollaboratorInfo[]> {
  const activeUserIds = await redis.zrange(
    PageKeys.PageSubscribers(pageId),
    0,
    -1
  );

  if (activeUserIds.length === 0) return [];

  const users = await db.user.findMany({
    where: { id: { in: activeUserIds } },
    select: { id: true, fullName: true, avatarUrl: true },
  });

  logger.debug("Fetched active collaborators", {
    pageId,
    count: users.length,
  });

  return users.map((u) => ({
    userId: u.id,
    fullName: u.fullName ?? "Unknown",
    avatarUrl: u.avatarUrl ?? null,
  }));
}
