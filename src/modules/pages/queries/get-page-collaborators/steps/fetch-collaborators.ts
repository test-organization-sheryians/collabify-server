/**
 * Step 2 — Fetch Collaborators
 *
 * Loads all pageCollaborator records with their user profile join, ordered by
 * joinedAt ASC (original member first). This is the authoritative DB list —
 * for live presence use getActivePageCollaborators (reads Redis ZSET).
 */

import type { PrismaClient } from "@prisma/client";
import type { CollaboratorWithUser } from "../types";

export async function fetchCollaborators(
  pageId: string,
  db: PrismaClient
): Promise<CollaboratorWithUser[]> {
  return db.pageCollaborator.findMany({
    where: { pageId },
    include: {
      user: {
        select: { id: true, email: true, fullName: true, avatarUrl: true },
      },
    },
    orderBy: { joinedAt: "asc" },
  }) as Promise<CollaboratorWithUser[]>;
}
