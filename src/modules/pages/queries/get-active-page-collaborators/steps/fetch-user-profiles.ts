/**
 * Step 3 — Fetch User Profiles
 *
 * Batch user.findMany for all active userIds, then join with the ordered
 * activeIds list to produce the final ActiveCollaborator[].
 *
 * Silently drops any userId that has no DB record (stale ZSET entry from a
 * deleted user account). The result preserves the ZRANGE order (join time ASC).
 */

import type { PrismaClient } from "@prisma/client";
import type { ActiveCollaborator } from "../types";

export async function fetchUserProfiles(
  activeIds: string[],
  db: PrismaClient
): Promise<ActiveCollaborator[]> {
  const users = await db.user.findMany({
    where: { id: { in: activeIds } },
    select: { id: true, fullName: true, email: true, avatarUrl: true },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));
  const joinedAt = new Date().toISOString();

  return activeIds
    .map((id): ActiveCollaborator | null => {
      const user = userMap.get(id);
      if (!user) return null; // stale ZSET entry — user deleted

      return {
        userId: id,
        role: "VIEWER",
        joinedAt,
        user: {
          id: user.id,
          fullName: user.fullName ?? "",
          email: user.email,
          avatarUrl: user.avatarUrl ?? null,
        },
      };
    })
    .filter((c): c is ActiveCollaborator => c !== null);
}
